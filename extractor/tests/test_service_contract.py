# extractor/tests/test_service_contract.py
"""새 전용 서비스의 표면 계약 검증 (cr-report 이식 시 신규 작성).

원본 cr-check의 테스트는 분석·리포트 라우트까지 함께 가진 앱을 전제한다.
이 파일은 그와 별개로, **이 서비스가 추출 외의 것을 노출하지 않는다**는
새 조건만 본다. 파서 동작 자체는 원본 테스트가 계속 담당한다.

네트워크를 쓰지 않는다. safe_fetch는 원본과 같은 방식으로 모킹한다.
"""

import io
import os
import re
from contextlib import contextmanager
from unittest.mock import patch

from fastapi.testclient import TestClient

from _support import load_fixture, make_parsed_response

import extract_api
import main
from safe_fetch import SafeFetchResult

KEY = "test-extract-key-0123456789abcdef"
HEADERS = {"X-CR-Extract-Key": KEY}

GENERIC_URL = "https://example-news.co.kr/article/1234"
PARTIAL_URL = "https://example-news.co.kr/article/5678"

client = TestClient(main.app)


@contextmanager
def extract_key_env(value):
    with patch.dict(os.environ, {}, clear=False):
        if value is None:
            os.environ.pop("EXTRACT_API_KEY", None)
        else:
            os.environ["EXTRACT_API_KEY"] = value
        yield


@contextmanager
def stubbed(fixture, final_url, env_key=KEY):
    def _stub(_requested):
        return SafeFetchResult(
            response=make_parsed_response(
                load_fixture(fixture),
                content_type="text/html; charset=utf-8",
                url=final_url,
            ),
            final_url=final_url,
        )

    with extract_key_env(env_key), patch.object(extract_api, "safe_fetch", _stub):
        yield


# --- /health ----------------------------------------------------------------

def test_health_identifies_this_service_and_parser_version():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "status": "ok",
        "service": "cr-report-extractor",
        "extractor_version": extract_api.EXTRACTOR_VERSION,
    }
    # 서비스가 옮겨졌다는 사실은 service 이름으로 구별한다. 파서 판본은 원본과
    # 같아야 하며 이사 때문에 바뀌지 않는다.
    assert body["extractor_version"] == "2026.09.1"


def test_health_needs_no_key_and_makes_no_outbound_request():
    """키가 없어도 health는 200이고, 그 과정에서 외부 fetch를 하지 않는다."""
    calls = []

    def _tripwire(url):
        calls.append(url)
        raise AssertionError("health가 외부 요청을 시도했습니다")

    with extract_key_env(None), patch.object(extract_api, "safe_fetch", _tripwire):
        response = client.get("/health")

    assert response.status_code == 200
    assert calls == []


def test_health_body_has_no_secret_or_internal_detail():
    body = client.get("/health").json()
    assert set(body) == {"status", "service", "extractor_version"}

    flat = repr(body).lower()
    for leak in ("key", "token", "secret", "password", "supabase", "anthropic",
                 "openai", "postgres", "/app", "railway", "env"):
        assert leak not in flat, f"health 응답에 노출되면 안 되는 낱말: {leak}"


# --- 라우팅 표면 -------------------------------------------------------------

def test_only_health_and_extract_are_registered():
    """추출 서비스의 공개 경로는 /health 와 /extract 뿐이다."""
    paths = sorted(
        route.path for route in main.app.routes
        if getattr(route, "path", "").startswith("/")
        and not getattr(route, "path", "").startswith("/openapi")
    )
    assert paths == ["/extract", "/health"], paths


def test_analysis_and_doc_routes_are_absent():
    for path in ("/analyze", "/report/example", "/docs", "/redoc", "/openapi.json"):
        response = client.get(path)
        assert response.status_code == 404, f"{path} 가 404가 아닙니다: {response.status_code}"

    # POST 쪽도 마찬가지다 — 메서드 차이로 405가 나오는 일이 없어야 한다.
    assert client.post("/analyze", json={}).status_code == 404


# --- 키·계약 ----------------------------------------------------------------

def test_app_boots_without_key_and_extract_is_disabled():
    """키가 없어도 앱은 살아 있고, /extract만 기존 503 계약으로 닫힌다."""
    with stubbed("generic_utf8.html", GENERIC_URL, env_key=None):
        assert client.get("/health").status_code == 200
        response = client.post("/extract", json={"url": GENERIC_URL}, headers=HEADERS)

    assert response.status_code == 503
    assert response.json()["code"] == "EXTRACTOR_DISABLED"


def test_wrong_or_missing_caller_key_is_401_when_server_key_is_set():
    with stubbed("generic_utf8.html", GENERIC_URL):
        missing = client.post("/extract", json={"url": GENERIC_URL})
        wrong = client.post("/extract", json={"url": GENERIC_URL},
                            headers={"X-CR-Extract-Key": "not-the-key"})

    for response in (missing, wrong):
        assert response.status_code == 401
        assert response.json()["code"] == "UNAUTHORIZED_CALLER"


def test_fixture_extraction_keeps_success_and_partial_contracts():
    with stubbed("generic_utf8.html", GENERIC_URL):
        success = client.post("/extract", json={"url": GENERIC_URL}, headers=HEADERS)
    with stubbed("generic_no_meta.html", PARTIAL_URL):
        partial = client.post("/extract", json={"url": PARTIAL_URL}, headers=HEADERS)

    assert success.status_code == 200
    body = success.json()
    assert list(body) == ["ok", "status", "article", "warnings", "content_chars",
                          "extractor_version"]
    assert body["status"] == "success"
    assert list(body["article"]) == ["title", "content", "url", "publisher",
                                     "journalist", "publish_date", "source_kind"]

    assert partial.status_code == 200
    assert partial.json()["status"] == "partial"


# --- 런타임 격리 -------------------------------------------------------------

_FORBIDDEN_DISTRIBUTIONS = ("anthropic", "openai", "supabase", "json_repair",
                            "weasyprint")


def _is_installed(name: str) -> bool:
    """그 이름의 배포판이 실제로 설치돼 있는가.

    `importlib.util.find_spec` 을 쓰지 않는 이유: 저장소 루트에서 pytest 를
    돌리면 sys.path 에 루트가 들어가고, cr-report 의 `supabase/` 폴더(스키마
    SQL 이 들어 있다)가 네임스페이스 패키지로 잡혀 거짓 양성이 난다. 설치된
    배포판 목록을 보면 작업 디렉터리와 무관하게 같은 답이 나온다.
    """
    from importlib.metadata import PackageNotFoundError, distribution

    for candidate in (name, name.replace("_", "-")):
        try:
            distribution(candidate)
            return True
        except PackageNotFoundError:
            continue
    return False


def test_installed_package_detector_actually_detects():
    """검사가 '항상 참'으로 굳지 않았는지 먼저 확인한다."""
    assert _is_installed("fastapi"), "런타임 의존성조차 못 찾으면 검사가 망가진 것이다"
    assert _is_installed("pytest"), "지금 이 검사를 돌리는 도구는 설치돼 있어야 한다"
    assert not _is_installed("this-package-does-not-exist-cr-report")


def test_runtime_has_no_ai_or_db_packages_installed():
    """분석·저장용 패키지가 이 환경에 아예 설치되어 있지 않다.

    dev 의존성에도 없어야 한다. 이 검사가 깨지면 requirements 가 오염된 것이다.
    독립성 검사를 통과시키려고 이 패키지들을 다시 깔거나 빈 core 모듈을 만드는
    일을 막는 자리이기도 하다.
    """
    installed = [name for name in _FORBIDDEN_DISTRIBUTIONS if _is_installed(name)]
    assert installed == [], (
        f"추출 서비스에 필요 없는 패키지가 설치돼 있습니다: {installed}"
    )


# 이 서비스가 환경에서 무엇을 읽는지는 **배포되는 코드의 성질**로 확인한다.
# 개발자 셸에는 Claude Code 의 ANTHROPIC_API_KEY 처럼 정당한 자격증명이 있을
# 수 있어, "지금 이 프로세스의 os.environ 에 AI 키가 없다"는 식의 검사는 환경에
# 따라 흔들린다. 컨테이너가 받는 변수는 Railway 가 넣어 주는 것뿐이므로,
# 여기서는 이식된 모듈이 읽는 환경변수 이름의 집합을 직접 확인한다.

_SHIPPED_MODULES = ("main.py", "extract_api.py", "safe_fetch.py", "scraper.py")

_ENV_READ_RE = re.compile(
    r"""os\.environ\.get\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']"""
    r"""|os\.environ\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']"""
    r"""|os\.getenv\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']"""
)


def _env_names_read_by(path: str) -> set:
    source = io.open(path, encoding="utf-8").read()
    return {name for match in _ENV_READ_RE.finditer(source) for name in match.groups() if name}


def test_env_scanner_actually_finds_names():
    """아래 검사가 '아무것도 못 찾아서 통과'하는 상태로 굳지 않았는지 먼저 본다."""
    import tempfile

    sample = (
        'os.environ.get("ANTHROPIC_API_KEY")\n'
        "os.environ['SUPABASE_URL']\n"
        'os.getenv("DATABASE_URL")\n'
    )
    with tempfile.NamedTemporaryFile("w", suffix=".py", encoding="utf-8", delete=False) as handle:
        handle.write(sample)
        temp_path = handle.name
    try:
        assert _env_names_read_by(temp_path) == {
            "ANTHROPIC_API_KEY", "SUPABASE_URL", "DATABASE_URL"
        }
    finally:
        os.unlink(temp_path)


def test_shipped_code_reads_only_the_extract_key_from_env():
    """이식된 모듈이 읽는 환경변수는 추출 키 하나뿐이다.

    분석·DB 자격증명(ANTHROPIC_API_KEY·OPENAI_API_KEY·SUPABASE_*·DATABASE_URL)
    을 읽는 코드가 새로 들어오면 여기서 막힌다. 이 서비스는 임의 URL을 읽는
    쪽이라 컨테이너에 그런 자격증명을 두지 않는 것이 원칙이다.
    """
    extractor_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    found = {}
    for filename in _SHIPPED_MODULES:
        names = _env_names_read_by(os.path.join(extractor_dir, filename))
        if names:
            found[filename] = sorted(names)

    assert found == {"extract_api.py": ["EXTRACT_API_KEY"]}, found


def test_shipped_code_never_dumps_the_whole_environment():
    """환경 전체를 훑어 로그·응답에 흘리는 코드가 없다."""
    extractor_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    offenders = []
    for filename in _SHIPPED_MODULES:
        source = io.open(os.path.join(extractor_dir, filename), encoding="utf-8").read()
        for bad in ("dict(os.environ", "os.environ.items(", "os.environ.keys(",
                    "list(os.environ"):
            if bad in source:
                offenders.append(f"{filename}: {bad}")

    assert offenders == [], offenders


def test_imports_resolve_inside_this_repository():
    """cr-check의 PYTHONPATH가 끼어들지 않고 extractor/ 아래가 쓰인다."""
    extractor_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for module in (main, extract_api):
        assert os.path.dirname(os.path.abspath(module.__file__)) == extractor_dir, (
            f"{module.__name__} 이(가) 저장소 밖에서 import 됐습니다: {module.__file__}"
        )

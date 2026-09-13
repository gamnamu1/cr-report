# 이 폴더의 출처

이 폴더의 파서는 **새로 만든 것이 아니라 `gamnamu1/cr-check` 에서 고정 커밋
기준으로 복사한 것**이다. 누가 언제 무엇을 옮겼는지, 그리고 무엇을 바꾸지
않았는지를 여기에 남긴다.

| 항목 | 값 |
|---|---|
| 원본 저장소 | `gamnamu1/cr-check` |
| 고정 커밋 (SHA) | `b9e51ad65926f298d23da726f6f5e28e63ab868f` |
| 원본 커밋 일자 | 2026-09-13 (Merge pull request #66 from gamnamu1/perf/extract-concurrency) |
| 복사 대상 | `gamnamu1/cr-report` 의 `extractor/` |
| 복사일 | 2026-09-13 |
| 읽은 방법 | 로컬 cr-check 클론에서 `git show <SHA>:<path>` (작업 트리·원격·배포·키에 쓰지 않음) |

원본 링크: <https://github.com/gamnamu1/cr-check/tree/b9e51ad65926f298d23da726f6f5e28e63ab868f>

## 소유와 동기화

복사 이후 이 파서는 **cr-report 가 독립적으로 관리한다.** cr-check 와 자동으로
동기화되지 않는다. 여기를 고쳐도 cr-check 에 반영되지 않고, cr-check 가
바뀌어도 여기로 흘러들어오지 않는다. 공용 패키지·submodule·자동 복사
파이프라인을 두지 않았다. 양쪽을 함께 고쳐야 할 일이 생기면 그때 개별로
판단한다.

cr-check 는 계속 운영·실험한다. 이 복사는 cr-check 를 닫거나 얼리는 작업이
아니다.

## 바이트 단위로 같은 파일

아래 파일은 개행·주석·상수까지 원본 그대로다. 이식하면서 매체 지원 확대·
문장 정리·포맷터 적용·함수 이동을 하지 않았다. 원본 SHA-256 과 복사본
SHA-256 이 같다.

### 핵심 3파일

| 원본 경로 | 이 폴더의 경로 | SHA-256 |
|---|---|---|
| `backend/extract_api.py` | `extractor/extract_api.py` | `c60d47c0d0ea468329fe5a31c12c36670a97d32dac007c0d903e4ccdb442eb79` |
| `backend/safe_fetch.py` | `extractor/safe_fetch.py` | `caebf357ad5fb7ee9d4a797d78ab48ae9cf94cda48e8b3271ab9414d4729179a` |
| `backend/scraper.py` | `extractor/scraper.py` | `7d3ebc9cf23bd3bd324ff0c2e55a1a932bee8f6838d0ef5e5a4377d0ae49871b` |

### 라이선스

| 원본 경로 | 이 폴더의 경로 | SHA-256 |
|---|---|---|
| `LICENSE` | `extractor/LICENSE` | `53d064e085d44850ddb5bfe9531e34ebcfb69abf0c0a4a62400d420709d8dcb6` |

### 테스트와 fixture (변경 없이 복사)

`test_extract_endpoint.py` 는 아래 '유일한 예외' 항목대로 한 함수만 바뀌었다.
나머지는 전부 원본 그대로다.

| 원본 경로 | 이 폴더의 경로 | 원본 SHA-256 | 복사본 SHA-256 | 원본과 동일 |
|---|---|---|---|---|
| `backend/tests/_support.py` | `extractor/tests/_support.py` | `108773152d7fdd9abb0b8967c7805dfcf6b4214e5028b8544bbb8db6c7c7c7fe` | `108773152d7fdd9abb0b8967c7805dfcf6b4214e5028b8544bbb8db6c7c7c7fe` | O |
| `backend/tests/conftest.py` | `extractor/tests/conftest.py` | `bd7b5cf35cd2d79dee2be579391380868ab4fd5d1d2860af344c5358a4c094bb` | `bd7b5cf35cd2d79dee2be579391380868ab4fd5d1d2860af344c5358a4c094bb` | O |
| `backend/tests/fixtures/generic_no_meta.html` | `extractor/tests/fixtures/generic_no_meta.html` | `7717843f00c6c122fb2b4a7713faaf9630290d9a23f88f0d485928b340abb86e` | `7717843f00c6c122fb2b4a7713faaf9630290d9a23f88f0d485928b340abb86e` | O |
| `backend/tests/fixtures/generic_utf8.html` | `extractor/tests/fixtures/generic_utf8.html` | `4f31595fe1a38a81da0c06f89d01a1ea34183094aa232c129810b3c02db85fba` | `4f31595fe1a38a81da0c06f89d01a1ea34183094aa232c129810b3c02db85fba` | O |
| `backend/tests/fixtures/login_wall.html` | `extractor/tests/fixtures/login_wall.html` | `5a7e87cd170d446504dc2e9c6902fc8b55ff65a9d062bb135f1ad0fce9e93199` | `5a7e87cd170d446504dc2e9c6902fc8b55ff65a9d062bb135f1ad0fce9e93199` | O |
| `backend/tests/fixtures/nate_a_media_prefix_euckr.html` | `extractor/tests/fixtures/nate_a_media_prefix_euckr.html` | `fd2265414899c7e5140f6da88abc8e21dac7333d23a5fed0ffdb086954f19b66` | `fd2265414899c7e5140f6da88abc8e21dac7333d23a5fed0ffdb086954f19b66` | O |
| `backend/tests/fixtures/nate_a_prefix_euckr.html` | `extractor/tests/fixtures/nate_a_prefix_euckr.html` | `f2d886a3e37be6dbc3cbca275eac580d0ec1327b02f16af0b479e6c1c0c873e3` | `f2d886a3e37be6dbc3cbca275eac580d0ec1327b02f16af0b479e6c1c0c873e3` | O |
| `backend/tests/fixtures/nate_b_tail_noise_euckr.html` | `extractor/tests/fixtures/nate_b_tail_noise_euckr.html` | `e9fc5fae76eedeeecd39f19ab43b4ecc85a28f81908d9f9b77b76486804abd86` | `e9fc5fae76eedeeecd39f19ab43b4ecc85a28f81908d9f9b77b76486804abd86` | O |
| `backend/tests/fixtures/nate_byline_plain_euckr.html` | `extractor/tests/fixtures/nate_byline_plain_euckr.html` | `6de17436b71d47e9b1dea422bee30fbbf6a97de541c5aacb942fe3787b7035d6` | `6de17436b71d47e9b1dea422bee30fbbf6a97de541c5aacb942fe3787b7035d6` | O |
| `backend/tests/fixtures/nate_c_head_euckr.html` | `extractor/tests/fixtures/nate_c_head_euckr.html` | `ae13dff1a00c2e2291b5207661270ffe0e7e4853f7448b9354a754cdb54a4819` | `ae13dff1a00c2e2291b5207661270ffe0e7e4853f7448b9354a754cdb54a4819` | O |
| `backend/tests/fixtures/nate_c_head_h2_euckr.html` | `extractor/tests/fixtures/nate_c_head_h2_euckr.html` | `5cc51f3096c8e9566ae48cbad80eec11bfefb9d256ef07bcb4207ecc537b0c17` | `5cc51f3096c8e9566ae48cbad80eec11bfefb9d256ef07bcb4207ecc537b0c17` | O |
| `backend/tests/fixtures/nate_c_head_intern_euckr.html` | `extractor/tests/fixtures/nate_c_head_intern_euckr.html` | `f5a55d395506349494bcc015b496af008859721e8f0bc05295ac28c25eaca0d1` | `f5a55d395506349494bcc015b496af008859721e8f0bc05295ac28c25eaca0d1` | O |
| `backend/tests/fixtures/nate_c_head_joint_euckr.html` | `extractor/tests/fixtures/nate_c_head_joint_euckr.html` | `412658a297a0606e46ec16c8b55c05560a458d226c21b9580e1d0269a0653c88` | `412658a297a0606e46ec16c8b55c05560a458d226c21b9580e1d0269a0653c88` | O |
| `backend/tests/fixtures/nate_caption_reporter_euckr.html` | `extractor/tests/fixtures/nate_caption_reporter_euckr.html` | `df8defae264ecc2a65b294ab432f1efeea2a66b7641373dac113fcc13893fe1b` | `df8defae264ecc2a65b294ab432f1efeea2a66b7641373dac113fcc13893fe1b` | O |
| `backend/tests/fixtures/nate_euckr.html` | `extractor/tests/fixtures/nate_euckr.html` | `144f47a68e69464b18bfe5da3408583a7834a9b3efc6a2361b55611d3503a348` | `144f47a68e69464b18bfe5da3408583a7834a9b3efc6a2361b55611d3503a348` | O |
| `backend/tests/fixtures/nate_h3_no_separator_euckr.html` | `extractor/tests/fixtures/nate_h3_no_separator_euckr.html` | `2c3319b09824766f6a70f38aa8369a22fded34f59fec0858300572e07fcc42a4` | `2c3319b09824766f6a70f38aa8369a22fded34f59fec0858300572e07fcc42a4` | O |
| `backend/tests/fixtures/nate_head_h4_english_key_euckr.html` | `extractor/tests/fixtures/nate_head_h4_english_key_euckr.html` | `776c28261473f1ffe7950825cabccca91e6ba040ff18fbd12e22c3ff6a850a0b` | `776c28261473f1ffe7950825cabccca91e6ba040ff18fbd12e22c3ff6a850a0b` | O |
| `backend/tests/fixtures/nate_head_second_line_euckr.html` | `extractor/tests/fixtures/nate_head_second_line_euckr.html` | `f00e9d311824a021cabd115764c39e1ca521890659ea43e3edff06ca6ea8c81d` | `f00e9d311824a021cabd115764c39e1ca521890659ea43e3edff06ca6ea8c81d` | O |
| `backend/tests/fixtures/nate_head_tail_conflict_euckr.html` | `extractor/tests/fixtures/nate_head_tail_conflict_euckr.html` | `5b2b27d0ae10bac165ee63c144574b83c27b33a2605def21ea8af8861e7c7df2` | `5b2b27d0ae10bac165ee63c144574b83c27b33a2605def21ea8af8861e7c7df2` | O |
| `backend/tests/fixtures/nate_head_tail_same_euckr.html` | `extractor/tests/fixtures/nate_head_tail_same_euckr.html` | `dc732515d1c1c3e1f53fc033fee427e36c096363189e68b09caad2526cb26020` | `dc732515d1c1c3e1f53fc033fee427e36c096363189e68b09caad2526cb26020` | O |
| `backend/tests/fixtures/nate_head_wrong_publisher_euckr.html` | `extractor/tests/fixtures/nate_head_wrong_publisher_euckr.html` | `6b36fcc0bf443e2b7cf58d4e212e654484c14082f67061da6375748353868e0a` | `6b36fcc0bf443e2b7cf58d4e212e654484c14082f67061da6375748353868e0a` | O |
| `backend/tests/fixtures/nate_no_byline_euckr.html` | `extractor/tests/fixtures/nate_no_byline_euckr.html` | `3996104358ad02836871d65f725a52e9cb1cb368cef1205b71f6ac4476799ca7` | `3996104358ad02836871d65f725a52e9cb1cb368cef1205b71f6ac4476799ca7` | O |
| `backend/tests/fixtures/nate_s6_skip_to_byline_euckr.html` | `extractor/tests/fixtures/nate_s6_skip_to_byline_euckr.html` | `471d7abf9b7a639b29f743895b9790357614a655d35b0a1e6f897dd286d11cf1` | `471d7abf9b7a639b29f743895b9790357614a655d35b0a1e6f897dd286d11cf1` | O |
| `backend/tests/fixtures/nate_short_article_guard_euckr.html` | `extractor/tests/fixtures/nate_short_article_guard_euckr.html` | `e34e14e5fd7c1af6877a0eeffe454d268fe177f7267bfccb5b93022694340a2e` | `e34e14e5fd7c1af6877a0eeffe454d268fe177f7267bfccb5b93022694340a2e` | O |
| `backend/tests/fixtures/naver_utf8.html` | `extractor/tests/fixtures/naver_utf8.html` | `650c34cf820383010dad70481be4eb5f65f04d7e92c807d60484e50d61006df2` | `650c34cf820383010dad70481be4eb5f65f04d7e92c807d60484e50d61006df2` | O |
| `backend/tests/test_extract_endpoint.py` | `extractor/tests/test_extract_endpoint.py` | `bae4e310e599294f63ebee6005532e794937fbf7996d3890555c9faf79ac1ae9` | `e64e7d2350cccf53e73e495abb264bd0e300b45db7e5eed262c8e82b3684861a` | 아니오 — 아래 '유일한 예외' 참고 |
| `backend/tests/test_safe_fetch.py` | `extractor/tests/test_safe_fetch.py` | `7429d65d9acf0dae98561a94cc58de7f8cd19a31631888558dbab37842d7e927` | `7429d65d9acf0dae98561a94cc58de7f8cd19a31631888558dbab37842d7e927` | O |
| `backend/tests/test_scraper_nate_byline.py` | `extractor/tests/test_scraper_nate_byline.py` | `c8d14147ea760e6887a624bd95af90cded6a663ecb9521662d86714fa9357508` | `c8d14147ea760e6887a624bd95af90cded6a663ecb9521662d86714fa9357508` | O |
| `backend/tests/test_scraper_regression.py` | `extractor/tests/test_scraper_regression.py` | `b95df25b92363ae3c10e4279c125e1827c32fac7442ee9f199c52b95786a4de7` | `b95df25b92363ae3c10e4279c125e1827c32fac7442ee9f199c52b95786a4de7` | O |

`nate_*_euckr.html` 는 EUC-KR 로 저장된 fixture 다. 텍스트 도구로 읽어 다시
저장하면 인코딩 회귀 시험의 의미가 사라지므로 **바이트 단위로 복사**했고,
위 해시로 원본과 같음을 확인했다.

## 가져오지 않은 것

원본 `backend/` 에서 아래는 의도적으로 가져오지 않았다.

- `main.py` — 분석·리포트 라우트를 함께 얹는 원본 진입점. 이 폴더의 `main.py`
  는 `/health` 와 `/extract` 만 노출하도록 새로 썼다.
- `requirements.txt` 전체 — `anthropic`·`openai`·`json_repair`·
  `python-dotenv`·`python-multipart` 는 추출에 필요 없다.
- `Dockerfile` 전체 — WeasyPrint 시스템 라이브러리(PDF용)를 걷어냈다.
- `core/`, 분석용 `data/`, `references/`, `diagnostics/`, `scripts/`, `tools/`,
  `export.py`, `criteria_manager.py` 등 분석 계열 전부.
- `.env*` 실제 값, `.github/` 작업.

## 허용한 변경 — 유일한 예외

`tests/test_extract_endpoint.py` 의 마지막 함수 하나만 바꿨다.

| 원본 | 이 폴더 |
|---|---|
| `test_extract_never_touches_pipeline_storage_or_llm_clients` | `test_extract_runs_without_any_ai_or_db_module_import` |

**바꾼 이유.** 원본은 `core.pattern_matcher`·`core.report_generator`·
`core.storage` 를 직접 import 해서, `/extract` 요청 중에 그 클라이언트들이
호출되지 않는지 감시했다. 이 서비스에는 `core` 가 아예 없으므로 원본 구현은
import 단계에서 실패한다.

**어떻게 바꿨나.** 검사의 의도를 약화하지 않고 더 강하게 옮겼다. 원본은
"있는 모듈이 불리지 않음"을 봤지만, 대체본은 "없어야 할 모듈을 import 하려는
시도조차 없음"을 본다.

- 깨끗한 자식 프로세스(`python -I`, `PYTHONPATH` 제거)에서 검사한다. 부모
  pytest 프로세스에는 개발 도구가 이미 적재해 둔 모듈이 있을 수 있어,
  `sys.modules` 조회 하나로는 앱의 import 와 도구의 import 를 구분할 수 없다.
- `sys.meta_path` 맨 앞의 파인더가 `core`·`anthropic`·`openai`·`supabase`
  import 를 **기록한 뒤 차단**한다. 기록이 차단보다 먼저이므로, 앱이
  `try/except ImportError` 로 실패를 삼키더라도 시도한 사실이 남아 실패한다.
- 이름만 훑는 정적 검사로 대신하지 않는다. 실제로 `main` 을 import 하고,
  고정 fixture 대역으로 `/extract` 200 과 기대 제목까지 받아 본다.
- import 된 `main`·`extract_api` 의 실제 파일 경로가 이 폴더 아래인지도 함께
  확인한다. cr-check 의 로컬 경로가 끼어들면 여기서 드러난다.

삭제·skip·무의미한 참 조건으로 바꾸지 않았고, 다른 테스트의 예상값도 완화하지
않았다. 원본 21개 함수는 그대로 21개다.

### 실제 diff

아래는 고정 원본 `cr-check@b9e51ad65926f298d23da726f6f5e28e63ab868f` 의
`backend/tests/test_extract_endpoint.py` 와 현재 `extractor/tests/test_extract_endpoint.py`
를 `diff -u` 로 직접 비교한 결과다. 사람이 다시 쓰거나 요약하지 않았다.

**차이는 hunk 하나뿐이고 그 위치는 파일 끝(667줄~)이다.** 앞의 1~666줄은 바이트
단위로 같다 — 그 구간의 SHA-256 은 양쪽 모두
`47d90d9728cb9543706d3dd61ba9cefae6896569bdf7143c358e06e6cd1fe26e` 다. 즉 이
파일에서 바뀐 곳은 마지막 분리 검사 한 함수뿐이며, 다른 검사·fixture·상수·헬퍼는
건드리지 않았다.

```diff
--- cr-check@b9e51ad:backend/tests/test_extract_endpoint.py
+++ cr-report:extractor/tests/test_extract_endpoint.py
@@ -667,30 +667,155 @@
     assert extract_api._active_extractions == 0
 
 
+
+
 # --- 분리 검증 --------------------------------------------------------------
+#
+# [cr-report 이식 시 대체한 유일한 검사]
+#
+# 원본(cr-check)의 `test_extract_never_touches_pipeline_storage_or_llm_clients`
+# 는 `core.pattern_matcher` 등 분석 모듈을 직접 import해, /extract 요청 중에
+# RAG·Supabase·LLM 클라이언트가 불리지 않는지 감시했다. 이 서비스에는 그
+# 모듈들이 아예 없으므로 원본 구현을 그대로 쓸 수 없다.
+#
+# 검사의 의도는 더 강하게 옮긴다. 원본은 "있는 모듈이 불리지 않음"을 봤지만,
+# 여기서는 "없어야 할 모듈을 import하려는 시도조차 없음"을 본다. 삭제·skip·
+# 무의미한 참 조건으로 바꾸지 않는다.
+#
+# 구현 요건
+#   - 깨끗한 자식 프로세스에서 검사한다. 부모 pytest 프로세스에는 개발 도구가
+#     이미 import해 둔 모듈이 있을 수 있어, `sys.modules` 조회 하나로는 앱의
+#     import와 도구의 import를 구분할 수 없다.
+#   - `sys.meta_path` 맨 앞의 파인더가 금지 모듈 import를 **기록한 뒤 막는다.**
+#     기록이 차단보다 먼저이므로, 앱이 `try/except ImportError`로 실패를
+#     삼키더라도 시도한 사실이 남아 실패로 드러난다.
+#   - 이름만 훑는 정적 검사(grep)로 대신하지 않는다. 실제로 main을 import하고
+#     fixture 대역으로 /extract 200까지 받아 본다.
+#   - 외부 HTTP를 호출하지 않는다. safe_fetch는 부모와 같은 방식으로 모킹한다.
+
+FORBIDDEN_TOP_LEVEL = ("core", "anthropic", "openai", "supabase")
+
+_ISOLATION_CHILD = r'''
+import json, os, sys
+
+FORBIDDEN = %(forbidden)r
+attempts = []
+
+class _Guard:
+    """금지 모듈 import를 기록한 뒤 차단한다. 기록이 차단보다 먼저다."""
+
+    def find_module(self, fullname, path=None):        # py2 호환 훅(미사용)
+        return None
+
+    def find_spec(self, fullname, path=None, target=None):
+        top = fullname.split(".")[0]
+        if top in FORBIDDEN:
+            attempts.append(fullname)
+            raise ImportError(
+                "차단된 모듈입니다(분리 검증): %%s" %% fullname, name=fullname
+            )
+        return None
+
+sys.meta_path.insert(0, _Guard())
+
+# AI·DB 자격증명이 전혀 없는 환경을 만든다.
+for name in list(os.environ):
+    if any(k in name.upper() for k in
+           ("ANTHROPIC", "OPENAI", "SUPABASE", "DATABASE", "POSTGRES", "REDIS")):
+        os.environ.pop(name, None)
+os.environ["EXTRACT_API_KEY"] = %(key)r
+
+sys.path.insert(0, %(extractor_dir)r)
+sys.path.insert(0, %(tests_dir)r)
+
+from unittest.mock import patch
+
+import main                      # 앱 import 자체가 검사 대상이다
+import extract_api
+from fastapi.testclient import TestClient
+from safe_fetch import SafeFetchResult
+from _support import load_fixture, make_parsed_response
+
+url = %(url)r
 
-def test_extract_never_touches_pipeline_storage_or_llm_clients():
-    """/extract 한 요청에서 RAG·Supabase·LLM 클라이언트가 한 번도 불리지 않는다."""
-    import core.pattern_matcher as pattern_matcher
-    import core.report_generator as report_generator
-    import core.storage as storage
-
-    spies = {
-        "run_pipeline": patch.object(main, "run_pipeline", MagicMock()),
-        "get_cached_analysis": patch.object(main, "get_cached_analysis", MagicMock()),
-        "save_analysis_result": patch.object(main, "save_analysis_result", MagicMock()),
-        "pattern_matcher.Anthropic": patch.object(pattern_matcher, "Anthropic", MagicMock()),
-        "pattern_matcher.OpenAI": patch.object(pattern_matcher, "OpenAI", MagicMock()),
-        "report_generator.Anthropic": patch.object(report_generator, "Anthropic", MagicMock()),
-        "storage.httpx": patch.object(storage, "httpx", MagicMock()),
+def _stub(_requested):
+    return SafeFetchResult(
+        response=make_parsed_response(
+            load_fixture(%(fixture)r),
+            content_type="text/html; charset=utf-8",
+            url=url,
+        ),
+        final_url=url,
+    )
+
+with patch.object(extract_api, "safe_fetch", _stub):
+    response = TestClient(main.app).post(
+        "/extract", json={"url": url}, headers={"X-CR-Extract-Key": %(key)r}
+    )
+
+body = response.json()
+loaded = sorted(
+    m for m in sys.modules
+    if m.split(".")[0] in FORBIDDEN
+)
+
+print("@@RESULT@@" + json.dumps({
+    "status": response.status_code,
+    "ok": body.get("ok"),
+    "title": (body.get("article") or {}).get("title"),
+    "main_file": main.__file__,
+    "extract_api_file": extract_api.__file__,
+    "attempts": attempts,
+    "loaded": loaded,
+}, ensure_ascii=False))
+'''
+
+
+def test_extract_runs_without_any_ai_or_db_module_import():
+    """깨끗한 프로세스에서 앱을 띄워 /extract가 성공하고, 금지 모듈 import 시도가 없다."""
+    import json
+    import subprocess
+    import sys
+
+    tests_dir = os.path.dirname(os.path.abspath(__file__))
+    extractor_dir = os.path.dirname(tests_dir)
+
+    source = _ISOLATION_CHILD % {
+        "forbidden": FORBIDDEN_TOP_LEVEL,
+        "key": KEY,
+        "extractor_dir": extractor_dir,
+        "tests_dir": tests_dir,
+        "url": NAVER_URL,
+        "fixture": "naver_utf8.html",
     }
-    started = {name: ctx.__enter__() for name, ctx in spies.items()}
-    try:
-        with stubbed("naver_utf8.html", NAVER_URL):
-            response = client.post("/extract", json={"url": NAVER_URL}, headers=HEADERS)
-        assert response.status_code == 200
-        for name, spy in started.items():
-            assert not spy.called, f"{name}이(가) /extract 경로에서 호출됐다"
-    finally:
-        for ctx in spies.values():
-            ctx.__exit__(None, None, None)
+
+    # PYTHONPATH를 비워 cr-check 등 다른 저장소 경로가 끼어들지 못하게 한다.
+    env = {k: v for k, v in os.environ.items() if k != "PYTHONPATH"}
+
+    completed = subprocess.run(
+        [sys.executable, "-I", "-c", source],
+        capture_output=True, text=True, timeout=120, env=env,
+    )
+    assert completed.returncode == 0, (
+        "분리 검증 자식 프로세스가 실패했습니다.\n"
+        f"stdout:\n{completed.stdout}\nstderr:\n{completed.stderr}"
+    )
+
+    marker = "@@RESULT@@"
+    assert marker in completed.stdout, completed.stdout
+    result = json.loads(completed.stdout.split(marker, 1)[1].splitlines()[0])
+
+    # ① 금지 모듈을 import하려는 시도 자체가 없었다.
+    #    (파인더가 기록을 먼저 하므로, 앱이 ImportError를 삼켜도 여기 남는다.)
+    assert result["attempts"] == [], f"금지 모듈 import 시도: {result['attempts']}"
+    assert result["loaded"] == [], f"금지 모듈이 적재됨: {result['loaded']}"
+
+    # ② 그 상태에서 고정 fixture 추출이 기존 계약대로 성공했다.
+    assert result["status"] == 200, result
+    assert result["ok"] is True, result
+    assert result["title"] == EXPECTED_TITLE, result
+
+    # ③ 실제로 import된 것이 cr-report/extractor 아래의 파일이다.
+    #    (cr-check의 PYTHONPATH가 끼어들면 여기서 드러난다.)
+    assert result["main_file"] == os.path.join(extractor_dir, "main.py"), result
+    assert result["extract_api_file"] == os.path.join(extractor_dir, "extract_api.py"), result
```

diff 를 직접 재현하려면:

```bash
git -C <cr-check 클론> cat-file blob \
  b9e51ad65926f298d23da726f6f5e28e63ab868f:backend/tests/test_extract_endpoint.py \
  > /tmp/orig_test_extract_endpoint.py

diff -u /tmp/orig_test_extract_endpoint.py extractor/tests/test_extract_endpoint.py
```

## 새로 쓴 파일

| 파일 | 역할 |
|---|---|
| `main.py` | `/health` + `extract_api` 라우터만. 분석·DB·CORS·dotenv 없음 |
| `requirements.txt` | 런타임 의존성. 버전 근거는 파일 안 주석 참고 |
| `requirements-dev.txt` | 위 + 테스트 전용(pytest·httpx) |
| `Dockerfile` | Python 3.11, 비루트 UID 10001, 워커 2, `--no-access-log` |
| `.dockerignore` | 허용 목록 방식 |
| `.env.example` | 추출 키 하나. 가짜 값만 |
| `tests/test_service_contract.py` | 새 서비스 표면(health·404·키 계약·격리) 검사 |
| `SOURCE.md` | 이 파일 |
| `README.md` | 실행·배포·검증·복구 |

## 원본 주석의 옛 경로 이름

이식된 파일 안에는 `backend/tests/...` 처럼 원본 저장소 기준 경로를 적은
주석이 남아 있다. 이사 작업에서 핵심 파일의 주석을 대량으로 손대지 않기로
했기 때문이다(해시 동일성이 깨진다). 현재 소유와 관리 원칙은 이 문서와
`README.md` 가 설명한다.

## 라이선스

`LICENSE` 는 원본 저장소의 파일을 그대로 복사한 것이다. Docker build context
가 `extractor/` 라 상위 폴더를 COPY 할 수 없어 이 폴더에 함께 둔다. 원본
저작권 표시를 덮어쓰거나 새 소유권을 주장하지 않는다.

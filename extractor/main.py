"""cr-report 전용 기사 추출 서비스의 진입점.

역할은 두 가지뿐이다 — `extract_api`의 `/extract` 라우터를 얹고, 생존 확인용
`/health`를 제공한다. 분석 파이프라인·DB 클라이언트·dotenv 자동 로딩·CORS는
이 서비스에 두지 않는다. 임의 URL을 읽는 서비스이므로 컨테이너 안에 DB·AI
자격증명을 두지 않는다는 원칙과 짝을 이룬다.

`/health`는 무인증이며 외부 요청을 만들지 않는다. 키 값·환경변수 목록·내부
경로를 노출하지 않는다. 키가 없어도 앱은 정상 기동하고 `/health`는 200이며
`/extract`만 기존 계약대로 503 EXTRACTOR_DISABLED를 반환한다. 따라서 배포
준비 완료는 `/health` 200만으로 판정하지 않고 인증된 추출까지 확인한다.

`/docs`·`/redoc`·`/openapi.json`은 끈다. 이 서비스는 Vercel 서버만 호출한다.
"""

from fastapi import FastAPI

from extract_api import EXTRACTOR_VERSION, router as extract_router

app = FastAPI(
    title="CR-report Article Extractor",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.include_router(extract_router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "cr-report-extractor",
        "extractor_version": EXTRACTOR_VERSION,
    }

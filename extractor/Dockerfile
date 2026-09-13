# extractor/Dockerfile — cr-report 전용 기사 추출 서비스
#
# 원본(cr-check backend)의 Dockerfile 에서 이 서비스에 필요 없는 것을 걷어냈다.
# WeasyPrint 시스템 라이브러리(libpango 등)는 PDF 생성용이라 넣지 않는다.
# Chromium·Playwright·볼륨·DB 클라이언트도 없다.
#
# 확인된 베이스 이미지: python:3.11-slim
#   (2026-09-13 cr-check 운영 빌드가 해결한 digest:
#    sha256:9534e5a8e315485d4061ed659af0fd78a284c015f9b73661b41d6bab25604534)
#   태그로 두는 이유는 보안 패치를 계속 받기 위해서다. 실제로 어떤 patch
#   버전이 쓰였는지는 매 빌드 로그에 기록된다.
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 런타임 의존성만 설치한다. requirements-dev.txt 는 이미지에 넣지 않는다.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 필요한 파일만 명시적으로 복사한다. `COPY . .` 로 로컬 비밀값·시험 산출물·
# tests·fixture 까지 넣지 않는다. (.dockerignore 가 build context 단계에서
# 한 번 더 막는다 — 두 겹을 모두 유지한다.)
COPY main.py extract_api.py safe_fetch.py scraper.py ./
COPY LICENSE ./

# 비루트 실행. 고정 UID 를 쓰면 플랫폼이 바뀌어도 파일 권한이 예측 가능하다.
# /app 은 읽기·실행만 필요하다. 기사 데이터를 쓰는 경로는 없다.
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin extractor \
    && chown -R root:root /app \
    && chmod -R a-w /app
USER 10001

EXPOSE 8000

# 워커 2개. 동시 추출 상한(extract_api.MAX_CONCURRENT_EXTRACTIONS = 20)은
# 프로세스별로 독립이므로, 복제본 1개·워커 2개면 정상 가동 중 동시 예약
# 상한이 40이 된다. 분당 40건이나 초당 40건을 뜻하지 않는다.
#
# --no-access-log: 임의 기사 URL이 기본 접근 로그의 query 로 남는 일을 줄인다.
#   extract_api 가 남기는 도메인·상태·경과시간 수준의 로그는 그대로다.
#
# 순수 exec form 으로는 ${PORT} 확장이 되지 않아 sh -c 로 감싸되 exec 를 붙인다.
# uvicorn master 가 PID 1 이 되어 SIGTERM 을 직접 받고 워커에 전파해야 재배포
# 시 정상 종료된다. 셸이 PID 1 로 남으면 그 전파가 끊긴다.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 --no-access-log"]

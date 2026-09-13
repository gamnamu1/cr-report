# cr-report 전용 기사 추출 서비스

기사 URL 을 받아 제목·본문·매체·기자·게재일을 돌려주는 작은 HTTP 서비스다.
cr-report 웹사이트의 "리포트 만들기"에서 기사를 자동으로 불러올 때 쓴다.

이 폴더의 파서는 `cr-check` 에서 복사한 것이다. 출처·고정 커밋·해시·바꾼
부분은 [`SOURCE.md`](./SOURCE.md) 를 본다.

```
시민 브라우저 → cr-report (Vercel)            → 이 서비스 (Railway)
                POST /api/extract                POST /extract
                서버 전용 키를 헤더에 붙임        X-CR-Extract-Key 검사
```

브라우저는 이 서비스를 직접 호출하지 않는다. Vercel 의 서버 함수만 HTTPS 로
호출한다. 그래서 CORS 설정이 없다 — "CORS 가 없어서 안전하다"는 뜻이 아니라,
인증은 헤더 키 검사로 한다는 뜻이다.

## 경로

| 경로 | 인증 | 하는 일 |
|---|---|---|
| `GET /health` | 없음 | 생존 확인. 외부 요청을 하지 않고 비밀값도 담지 않는다 |
| `POST /extract` | `X-CR-Extract-Key` | 기사 추출 |

`/analyze`·`/report/{id}`·`/docs`·`/redoc`·`/openapi.json` 은 **등록하지
않는다.** 요청하면 404 다. 분석은 이 서비스의 일이 아니다.

### `/health` 만으로 배포 완료를 판정하지 않는다

`EXTRACT_API_KEY` 가 없어도 앱은 정상 기동하고 `/health` 는 200 을 준다.
그 상태에서 `/extract` 만 503 `EXTRACTOR_DISABLED` 로 닫힌다. 그러니 배포
확인은 반드시 **인증된 추출 1건까지** 해 본다.

### 응답 계약

성공 200 / 부분성공 200(`status: "partial"` + warnings) / 요청 키 누락·불일치
401 `UNAUTHORIZED_CALLER` / 서버 키 미설정 503 `EXTRACTOR_DISABLED` / 혼잡
503 `EXTRACTOR_BUSY` / 그 밖의 오류는 원본과 같은 코드·상태를 유지한다.

`extractor_version` 은 **파서 판본**이다(`2026.09.1`). 서비스를 옮겼다고
올리지 않는다. 서비스가 어느 쪽인지는 `/health` 의 `service` 값
(`cr-report-extractor`)으로 구별한다.

## 환경변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `EXTRACT_API_KEY` | ✓ | cr-report 가 보내는 키와 같은 값. 최소 32바이트 난수 |
| `PORT` | | Railway 가 넣어 준다. 로컬에서만 직접 지정 |

**이 서비스가 읽는 앱 변수는 위 하나뿐이다.** `ANTHROPIC_API_KEY`·
`OPENAI_API_KEY`·`SUPABASE_*` 같은 분석·DB 자격증명을 넣지 않는다. 임의 URL 을
읽어 오는 서비스라 컨테이너 안에 다른 자격증명을 두지 않는 것이 설계의
일부다. cr-check 의 기존 키를 재사용하지도 않는다.

`tests/test_service_contract.py` 가 이식된 모듈이 읽는 환경변수 이름이
`EXTRACT_API_KEY` 하나뿐인지 검사한다.

## 로컬 실행

가상환경은 저장소 밖에 만든다.

```bash
python3.11 -m venv ~/.venvs/cr-report-extractor
source ~/.venvs/cr-report-extractor/bin/activate
pip install -r extractor/requirements-dev.txt

cd extractor
EXTRACT_API_KEY=local-dev-key uvicorn main:app --port 8000
```

확인:

```bash
curl -s localhost:8000/health
# {"status":"ok","service":"cr-report-extractor","extractor_version":"2026.09.1"}

curl -s -X POST localhost:8000/extract \
  -H 'Content-Type: application/json' \
  -H 'X-CR-Extract-Key: local-dev-key' \
  -d '{"url":"https://example-news.co.kr/article/1234"}'
```

### 웹(cr-report)과 연결하기

cr-report 의 `/api/extract` 는 `EXTRACT_API_BASE` 가 없으면 외부를 호출하지
않고 503 을 돌려준다. 로컬에서 기사 불러오기를 쓰려면 저장소 루트
`.env.local` 에 두 값을 넣는다.

```
EXTRACT_API_BASE=http://127.0.0.1:8000
EXTRACT_API_KEY=local-dev-key
```

`EXTRACT_API_BASE` 에는 `/extract` 를 붙이지 않는다. 웹이 알아서 붙인다.

## 테스트

```bash
cd extractor
python -m pytest tests -q
```

네트워크를 쓰지 않는다. 모든 검사가 고정 fixture 와 로컬 대역만 쓴다.
`nate_*_euckr.html` 은 EUC-KR 로 저장된 인코딩 회귀 자료이므로 편집기로 열어
다시 저장하지 않는다.

## 배포 (Railway)

| 설정 | 값 |
|---|---|
| Root Directory | `/extractor` |
| Watch Paths | `/extractor/**` |
| 빌드 | 이 폴더의 `Dockerfile` |
| Start Command | 플랫폼 override 없이 Dockerfile 의 `CMD` 사용 |
| 복제본 / 워커 | 1 / 2 |
| Healthcheck | `/health` |
| 볼륨 · cron · DB | 없음 |

Vercel 에서는 Railway 의 **공개 HTTPS 도메인**을 쓴다. `*.railway.internal`
은 같은 Railway 프로젝트·환경 안에서만 쓰는 사설 주소라 Vercel 에서 닿지
않는다.

### 동시 처리 상한의 의미

워커 2개 × 프로세스별 상한 20 = 복제본 1개에서 정상 가동 중 **동시 예약
최대 40**. 분당 40건이나 초당 40건이라는 뜻이 아니다. 복제본을 늘리거나
재배포 중 인스턴스가 겹치는 구간까지 통제하는 전역 상한도 아니다.

### 비용

요청이 없어도 프로세스가 떠 있으면 메모리 사용분이 과금 대상이다. "방문자가
없으면 무료"가 아니다. 자동 휴면은 첫 요청의 기동 지연을 바꾸므로 전환과
동시에 켜지 않는다.

## 알려진 한계 — 숨기지 않는다

원본의 SSRF 방어(URL 검증·내부 주소 차단·리디렉션 검사·2MB 응답 상한·시간
예산)를 그대로 보존했다. 다만 **완전한 차단 보증은 아니다.**

- **DNS 재해석 잔여 위험.** `safe_fetch` 는 DNS 를 검증한 뒤 실제 연결을
  맺는다. 그 사이에 이름이 다른 주소로 다시 해석될 수 있다(TOCTOU). 원본
  주석에도 명시돼 있다. 이번 이식에서 이 위험을 없애지 않았다 — DNS 고정
  연결·별도 프록시 도입은 이 라운드의 범위 밖이다.
- **전체 시간 예산은 best-effort** 다. 하드 컷오프가 아니다. 그래서 호출하는
  쪽(cr-report `/api/extract`)이 17초 타임아웃을 따로 건다.
- 위 때문에 **이 컨테이너에는 DB·AI 자격증명이나 다른 내부 서비스를 두지
  않는다.** 임의 URL 을 읽는 서비스가 가질 수 있는 최선의 방어는 "털려도 가져갈
  것이 없는 상태"다.

컨테이너에 쓰기 가능한 임시 공간이 있다는 것과 기사 데이터를 영속 저장하는
것은 다르다. 이 서비스는 기사 본문을 저장하지 않는다. 다만 플랫폼의 로그
수집 정책은 별개이므로 "어느 시스템에도 흔적이 없다"고 보증하지는 않는다.

## 고장났을 때

| 증상 | 먼저 볼 것 |
|---|---|
| `/health` 가 안 뜬다 | Root Directory 가 `/extractor` 인지, Dockerfile 이 쓰였는지, `PORT` 바인딩 |
| `/health` 는 200 인데 추출이 503 | 서비스에 `EXTRACT_API_KEY` 가 설정됐는지 |
| 추출이 401 | cr-report 쪽 키와 이 서비스 키가 같은 값인지 |
| 웹에서만 503 | cr-report 의 `EXTRACT_API_BASE`·`EXTRACT_API_KEY` 설정 여부. Vercel 환경변수는 **새 배포부터** 적용된다 |

새 서비스가 고장나도 자동으로 cr-check 로 우회하지 않는다. 그건 의도한
동작이다 — 조용히 옛 경로로 돌아가면 무엇이 실제로 쓰이는지 알 수 없게 된다.
되돌려야 하면 cr-report 의 `EXTRACT_API_BASE` 와 `EXTRACT_API_KEY` 를 **옛 값
쌍으로 함께** 되돌리고 새로 배포한다. 한쪽만 되돌리면 맞지 않는다.

# Critical Readers (cr-report)

시민이 검수한 뉴스 비평 리포트를 모아 공개하고, 시민이 직접 리포트를 만들 수
있도록 돕는 웹사이트.

CR 프로젝트의 운영 흐름에서 이 저장소는 검수 완료 리포트의 **아카이브**를
맡는다. 자동 분석 엔진은 별도 저장소(cr-check)에서 운영된다.

```
cr-project (기준)  →  cr-check (리포트 초안)  →  사람의 검수  →  cr-report (아카이브)
                            ↑                                          │
                            └──────────  골든 데이터셋  ←──────────────┘
```

한편 이 사이트의 `/analyze`(리포트 만들기)는 시민이 직접 리포트를 만들기 위한
간이 도구다. 이 기능은 cr-check 에서 **기사 추출(`/extract`)만** 이용하고, 분석
요청문은 cr-report 가 조립한다. 실제 비평 초안은 시민이 선택한 외부 AI 에서
만들어지며, 시민이 직접 검수한다.

## 기술 스택

- Next.js 15 (App Router, TypeScript)
- React 18
- TailwindCSS 3
- Supabase REST API (별도 SDK 없이 기본 `fetch` 로 호출)
- Vercel 배포

## 환경변수

Vercel 프로젝트와 로컬 `.env.local` 양쪽에 아래 값을 설정한다.
견본은 [`.env.example`](./.env.example) 참고.

| 변수 | 필수 | 설명 |
|------|------|------|
| `SUPABASE_URL` | ✓ | Supabase 프로젝트 URL (`https://xxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | ✓ | Supabase anon public API key |
| `NEXT_PUBLIC_SITE_URL` | ✓ | 사이트 정식 도메인 (`https://cr-report.kr`) |
| `EXTRACT_API_KEY` | 기사 자동 불러오기 사용 시 | cr-check `/extract` 호출용 서버 비밀키 |
| `EXTRACT_API_BASE` | | cr-check 백엔드의 베이스 URL. 미설정 시 CR 운영 백엔드로 폴백 |
| `ANALYZE_PUBLIC` | | `"true"` 이면 홈 풋터 노출·`/analyze` 색인·sitemap 등재. 직접 URL 접근은 항상 가능 |

`anon` 키로만 접근하며, 테이블은 RLS 로 SELECT 만 허용된다.

`SUPABASE_URL` 은 백엔드 주소이고 `NEXT_PUBLIC_SITE_URL` 은 이 사이트의 공개
도메인이다. 이름이 비슷하니 혼동하지 않는다.

`EXTRACT_API_KEY` 는 서버 전용이다. `NEXT_PUBLIC_` 접두어를 붙이면 브라우저
번들에 그대로 노출되므로 절대 붙이지 않는다. 프록시(`/api/extract`)가 서버에서만
읽어 cr-check 백엔드로 전달한다.

`EXTRACT_API_BASE` 는 cr-check 백엔드의 **베이스 URL** 이다. 코드가 여기에
`/extract` 를 붙여 호출하므로 값 끝에 `/extract` 를 넣지 않는다. 설정하지
않으면 CR 이 운영하는 백엔드로 폴백하므로, 포크해서 자기 백엔드를 쓰려면
반드시 이 값을 설정해야 한다.

`ANALYZE_PUBLIC` 은 문자열 `"true"` 만 참으로 취급하며 세 가지를 통제한다 —
홈 풋터 노출, `/analyze` 의 noindex, sitemap 등재. 설정하지 않으면 홈에서
풋터가 렌더되지 않고 `/analyze` 는 색인에서 빠지지만, 직접 URL 접근은 언제나
허용된다. 제작 중에는 비워 두고 공개 시점에 설정한다.
(`/analyze` 와 `/declaration` 자체의 풋터는 이 플래그와 무관하게 렌더된다.)

## 도메인

정식 도메인은 **https://cr-report.kr** 이다.
기존 `critical-readers.vercel.app` 주소도 계속 접속 가능하지만, 검색 색인이
두 도메인으로 갈라지지 않도록 아래 값은 **접속 호스트와 무관하게 항상 정식
도메인**으로 고정된다.

- `<link rel="canonical">` 및 OpenGraph `url` (리포트 상세)
- `robots.txt` 의 sitemap·host
- `sitemap.xml` 의 모든 URL
- 리포트 상세의 공유 버튼(링크 복사 / 페이스북 / X / 카카오)이 만드는 링크

기준값은 `NEXT_PUBLIC_SITE_URL` 환경변수 하나이며, 코드에서는
[`lib/site.ts`](./lib/site.ts) 가 이를 단일 진실 공급원으로 감싼다.
환경변수가 비어 있으면 `lib/site.ts` 의 `DEFAULT_SITE_URL` 로 폴백한다.

## 데이터 소스

Supabase 테이블 `citizen_reports` 한 행이 리포트 한 건을 완전하게 표현한다.
스키마 정의와 예시 SQL은 [`supabase/citizen_reports.sql`](./supabase/citizen_reports.sql) 참고.

컬럼 요약:

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `share_id` | text (PK) | URL 경로 `/report/{share_id}` |
| `title` | text | 기사 제목 |
| `url` | text | 원문 URL |
| `publisher` | text | 매체명 |
| `journalist` | text | 기자명 |
| `publish_date` | timestamptz | 기사 게재일 |
| `article_analysis` | jsonb | 기사 유형·요소·편집구조·취재방식·내용흐름 |
| `comprehensive_report` | text | 시민용 리포트 본문 |
| `journalist_report` | text | 기자용 리포트 본문 |
| `student_report` | text | 학생용 리포트 본문 |
| `created_at` | timestamptz | 게시 시각 (목록 정렬 기준) |

## 라우트

**읽기**

- `/` — 검수 완료 리포트 목록 (created_at 내림차순). 검색은 현재 전체
  클라이언트 필터 방식이다. 리포트가 50~100건에 도달하면 페이지 페이로드를
  측정해 서버 검색 전환을 재검토한다.
- `/report/{share_id}` — 리포트 상세. 존재하지 않으면 `notFound()`

**만들기 · 읽을거리**

- `/analyze` — 리포트 만들기. 기사 주소를 넣으면 분석 요청문을 조립해
  복사·저장할 수 있다. 시민이 그 요청문을 자기 AI 챗봇에 붙여넣어 리포트
  초안을 받고, 직접 검수한 뒤 메일로 보내는 흐름이다. 이 사이트는 분석을
  수행하지 않으며 기사 본문을 저장하지도 않는다.
- `/declaration` — '지금 우리는'. 프로젝트 선언문과 낭독 음원

**생성 라우트**

- `/robots.txt` — `app/robots.ts` 가 생성
- `/sitemap.xml` — `app/sitemap.ts` 가 생성 (홈 + 전체 리포트 URL)

**API (서버 전용)**

- `POST /api/extract` — cr-check 백엔드 `/extract` 로의 프록시. 비밀키를
  서버에서만 붙여 전달하고, 클라이언트 IP 별 분당 요청 수를 제한한다
  (인스턴스 로컬 best-effort — 외부 저장소를 쓰지 않으므로 전역 제한은 아니다)
- `GET /api/kit` — 분석 요청문에 붙일 자료(규범 원문·관행 지도·예시 리포트)를
  런타임에 내려준다. 번들 크기를 줄이기 위한 분리이며 보안 경계는 아니다

목록·상세는 서버 컴포넌트에서 Supabase REST API를 `cache: "no-store"` 로
호출하므로, 대시보드에서 새 리포트를 추가하면 다음 요청부터 바로 반영된다.

## 로컬 개발

```bash
# 의존성 설치
npm install

# .env.local 생성 (예시: .env.example 참고)
cp .env.example .env.local
# SUPABASE_URL, SUPABASE_ANON_KEY 값을 채운다
# 기사 자동 불러오기를 쓰려면 EXTRACT_API_KEY 를 설정한다
# 자기 cr-check 백엔드를 쓰려면 EXTRACT_API_BASE 도 설정한다
# 공개 노출을 켜려면 ANALYZE_PUBLIC=true 로 설정한다

# 개발 서버
npm run dev  # http://localhost:3000
```

## 프로덕션 빌드

```bash
npm run build
npm start
```

## 배포 (Vercel)

- 저장소를 그대로 프로젝트 루트로 임포트하면 된다 (Root Directory 별도 설정 불필요).
- Vercel 환경변수에 위 표의 값을 등록한다. `NEXT_PUBLIC_SITE_URL` 은 빌드
  시점에 번들에 인라인되므로, 값을 바꾸면 재배포해야 반영된다.
- `cr-report.kr` 를 Vercel 프로젝트의 도메인으로 연결한다. 기존
  `critical-readers.vercel.app` 은 리다이렉트 없이 그대로 두어도 되며,
  canonical 이 정식 도메인을 가리키므로 색인은 한쪽으로 모인다.

## 프로젝트 구조

```
cr-report/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                  # 리포트 목록
│   ├── robots.ts                 # /robots.txt 생성
│   ├── sitemap.ts                # /sitemap.xml 생성
│   ├── report/[id]/page.tsx      # 리포트 상세 (server component)
│   ├── analyze/
│   │   ├── page.tsx              # 리포트 만들기 (metadata·노출 통제)
│   │   └── AnalyzeFlow.tsx       # 4단계 흐름 전체 (client component)
│   ├── declaration/
│   │   ├── page.tsx              # '지금 우리는' 선언문
│   │   └── DeclarationAudio.tsx  # 낭독 음원 재생
│   └── api/
│       ├── extract/route.ts      # cr-check /extract 프록시 (서버 전용)
│       └── kit/route.ts          # 키트 자료 런타임 제공
├── components/
│   ├── ResultViewer.tsx          # 3종 탭 리포트 렌더러
│   ├── TxtPreviewModal.tsx       # TXT 내보내기 모달
│   ├── ExpandingSearch.tsx       # 홈 검색창 (돋보기 → 확장)
│   ├── SearchableReportList.tsx  # 검색어 필터링 목록
│   └── SiteFooter.tsx            # 풋터 4항목 + 메일 복사 모달
├── lib/
│   ├── kit/
│   │   ├── instructions.ts       # 분석 지시서 (요청문 앞부분)
│   │   ├── reference.ts          # 언론윤리규범 원문 · 문제적 보도관행 지도 · 예시 리포트
│   │   └── version.ts            # 요청문 판본 표기
│   ├── assembleKit.ts            # 기사 정보 + 키트 자료 → 분석 요청문 조립
│   ├── flags.ts                  # ANALYZE_PUBLIC 노출 플래그
│   ├── shareTitle.ts             # SNS 공유용 기사 제목 축약
│   ├── site.ts                   # 정식 도메인 단일 진실 공급원
│   ├── supabase.ts               # Supabase REST fetch helper (SDK 미사용)
│   └── utils.ts
├── types/
│   └── index.ts                  # AnalysisResult 등 타입 정의
├── supabase/
│   └── citizen_reports.sql       # DDL + RLS 정책 + 참고용 복사 SQL
├── public/
│   ├── audio/                    # 선언문 낭독 음원
│   ├── fonts/                    # 마루부리 (선언문 전용, 자체 호스팅)
│   └── og-image.jpg
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 다른 판본을 만들려면

이 저장소는 AGPL-3.0 으로 공개되어 있다. 다른 분야(예: 부동산 보도 전용)나
다른 언어권의 판본을 만들 수 있다. 코드 대부분은 그대로 쓸 수 있고, **바꿔야
하는 것은 한국 맥락에 묶인 자료**다.

**반드시 교체해야 하는 것**

| 대상 | 내용 |
|------|------|
| `lib/kit/reference.ts` | 한국 언론윤리규범 원문과 문제적 보도관행 지도, 예시 리포트. 그 사회의 언론 규범과 관행으로 통째 교체한다. 이 저장소에서 가장 큰 파일이며, 판본의 성격을 사실상 여기서 결정한다 |
| `app/declaration/`, `public/audio/` | CR 선언문과 낭독 음원. 자기 선언문으로 바꾸거나 페이지째 들어낸다 |
| `public/fonts/` | 마루부리는 한글 전용이다. 다른 언어권이면 불필요하다 |

**손봐야 하는 것**

| 대상 | 내용 |
|------|------|
| `lib/kit/instructions.ts` | 분석 지시서. 절차의 뼈대는 언어와 무관하지만, 규범을 참조하는 대목은 교체한 자료에 맞춘다 |
| `lib/shareTitle.ts` | 한국어 기사 제목의 "주제부…부연부" 구조를 전제한 축약 규칙이다. 언어마다 다시 설계해야 한다 |
| 기사 추출 | `/api/extract` 는 cr-check 백엔드를 호출한다. `EXTRACT_API_BASE` 를 설정하지 않으면 CR 이 운영하는 백엔드를 그대로 쓰게 되므로, 포크해 운영한다면 반드시 자기 백엔드를 지정한다. cr-check 의 파서는 한국 언론사·포털 마크업에 맞춰져 있어 그 사회의 매체에 맞는 파서도 필요하다 |

**거의 그대로 쓸 수 있는 것**

목록·검색·상세 UI, 4단계 분석 흐름, 요청문 조립(`assembleKit`), 노출 플래그,
도메인 처리, Supabase 스키마와 접근 코드, 설정 파일 전부.

`citizen_reports` 스키마의 세 리포트 컬럼(시민용·기자용·학생용)은 CR 이
정한 구조다. 독자를 다르게 나눈다면 스키마부터 바꾸는 편이 낫다.

**먼저 정해야 할 것**

코드를 고치기 전에 정해야 하는 것들이 있다. 이 판단이 판본의 성격을 만든다.

- 어떤 규범을 기준으로 삼을 것인가 (언론계가 스스로 세운 규범이 있는가)
- 그 사회에서 반복되는 보도 관행은 무엇인가
- 리포트를 누가 검수할 것인가

CR 은 마지막 질문, 즉 "누가 리포트를 검수할 것인가"에 시민이라고 답한다.
전문가의 역할이 중요하지 않아서가 아니다. 언론학자나 기자, 비평가는 언론을
오래 연구하고 경험해 온 만큼 중요한 지식과 관점을 가지고 있다. 다만 그만큼
언론계 안에서 익숙해진 관행이나 표현을 자연스럽게 받아들일 가능성도 있다.
시민은 그 바깥에서 기사를 읽기 때문에, 언론계에서 당연하게 여겨지는 것을
다시 묻고 낯설게 볼 수 있다. CR 은 전문가의 참여도 환영한다. 다만 그 참여가
최종 판단 권한이 아니라, 다른 시민들과 함께 검수에 참여하는 형태이기를
바란다. 검수의 구체적인 운영 방식은 리포트와 경험이 쌓이면서 계속 다듬어
가고 있다.

## 라이선스

GNU Affero General Public License v3.0 (AGPL-3.0). [`LICENSE`](./LICENSE) 파일 참고.

이 사이트에는 네이버에서 제공한 마루 부리 글꼴이 적용되어 있습니다.
글꼴은 AGPL 적용 대상이 아니며, 네이버가 정한 라이선스를 따릅니다.

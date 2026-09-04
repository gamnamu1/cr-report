# Critical Readers

시민이 검수한 뉴스 비평 리포트를 모아 두는 **열람 전용** 웹사이트.

리포트 생성·분석 파이프라인은 별도 저장소(cr-check)에서 운영된다.
이 저장소는 Supabase의 `citizen_reports` 테이블에 이미 저장된
검수 완료 리포트를 읽어 보여주기만 한다.

## 기술 스택

- Next.js 15 (App Router, TypeScript)
- React 18
- TailwindCSS 3
- Supabase REST API (별도 SDK 없이 기본 `fetch` 로 호출)
- Vercel 배포

## 환경변수

Vercel 프로젝트와 로컬 `.env.local` 양쪽에 아래 값을 설정한다.

| 변수 | 설명 |
|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL (`https://xxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase anon public API key |
| `NEXT_PUBLIC_SITE_URL` | 사이트 정식 도메인 (`https://cr-report.kr`) |

`anon` 키로만 접근하며, 테이블은 RLS 로 SELECT 만 허용된다.

`SUPABASE_URL` 은 백엔드 주소이고 `NEXT_PUBLIC_SITE_URL` 은 이 사이트의 공개
도메인이다. 이름이 비슷하니 혼동하지 않는다.

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

- `/` — 검수 완료 리포트 목록 (created_at 내림차순) > 검색은 현재 전체 클라이언트 필터 방식이다. 리포트가 50~100건에 도달하면 페이지 페이로드를 측정해 서버 검색 전환을 재검토한다.
- `/report/{share_id}` — 리포트 상세. 존재하지 않으면 `notFound()`
- `/robots.txt` — `app/robots.ts` 가 생성
- `/sitemap.xml` — `app/sitemap.ts` 가 생성 (홈 + 전체 리포트 URL)

두 경로 모두 서버 컴포넌트에서 Supabase REST API를 `cache: "no-store"` 로
호출하므로, 대시보드에서 새 리포트를 추가하면 다음 요청부터 바로 반영된다.

## 로컬 개발

```bash
# 의존성 설치
npm install

# .env.local 생성 (예시: .env.example 참고)
cp .env.example .env.local
# SUPABASE_URL, SUPABASE_ANON_KEY 값을 채운다

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
- Vercel 환경변수에 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
  을 등록. `NEXT_PUBLIC_SITE_URL` 은 빌드 시점에 번들에 인라인되므로, 값을
  바꾸면 재배포해야 반영된다.
- `cr-report.kr` 를 Vercel 프로젝트의 도메인으로 연결한다. 기존
  `critical-readers.vercel.app` 은 리다이렉트 없이 그대로 두어도 되며,
  canonical 이 정식 도메인을 가리키므로 색인은 한쪽으로 모인다.

## 프로젝트 구조

```
critical-readers/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx              # 리포트 목록
│   ├── robots.ts             # /robots.txt 생성
│   ├── sitemap.ts            # /sitemap.xml 생성
│   └── report/[id]/page.tsx  # 리포트 상세 (server component)
├── components/
│   ├── ResultViewer.tsx      # 3종 탭 리포트 렌더러
│   └── TxtPreviewModal.tsx   # TXT 내보내기 모달
├── lib/
│   ├── shareTitle.ts         # SNS 공유용 기사 제목 축약
│   ├── site.ts               # 정식 도메인 단일 진실 공급원
│   ├── supabase.ts           # Supabase REST fetch helper (SDK 미사용)
│   └── utils.ts
├── types/
│   └── index.ts              # AnalysisResult 등 타입 정의
├── supabase/
│   └── citizen_reports.sql   # DDL + RLS 정책 + 참고용 복사 SQL
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 라이선스

GNU Affero General Public License v3.0 (AGPL-3.0). `LICENSE` 파일 참고.

이 사이트에는 네이버에서 제공한 마루 부리 글꼴이 적용되어 있습니다.

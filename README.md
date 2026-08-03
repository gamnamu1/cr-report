# citizen-reviewers

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

Vercel 프로젝트와 로컬 `.env.local` 양쪽에 아래 두 값을 설정한다.

| 변수 | 설명 |
|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL (`https://xxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase anon public API key |

`anon` 키로만 접근하며, 테이블은 RLS 로 SELECT 만 허용된다.

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

- `/` — 검수 완료 리포트 목록 (created_at 내림차순)
- `/report/{share_id}` — 리포트 상세. 존재하지 않으면 `notFound()`

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
- Vercel 환경변수에 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 를 등록.

## 프로젝트 구조

```
citizen-reviewers/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx              # 리포트 목록
│   └── report/[id]/page.tsx  # 리포트 상세 (server component)
├── components/
│   ├── CachedBanner.tsx      # "게시된 리포트입니다" 배너
│   ├── ResultViewer.tsx      # 3종 탭 리포트 렌더러
│   └── TxtPreviewModal.tsx   # TXT 내보내기 모달
├── lib/
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

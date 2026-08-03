-- ============================================================================
-- citizen_reports: citizen-reviewers 열람 전용 사이트의 유일한 데이터 소스
--
-- 검수가 완료되어 공개해도 되는 리포트만 이 테이블에 넣는다.
-- 초안/비공개/작업중 리포트는 이 테이블에 두지 않는다는 것을 전제로 한다.
--
-- 이 파일은 산출물일 뿐, 자동으로 실행되지 않는다.
-- Supabase 대시보드의 SQL Editor 에 붙여 넣어 수동으로 적용한다.
-- ============================================================================

create table if not exists public.citizen_reports (
    share_id             text        primary key,
    title                text        not null,
    url                  text        not null,
    publisher            text,
    journalist           text,
    publish_date         timestamptz,
    article_analysis     jsonb,
    comprehensive_report text        not null,
    journalist_report    text        not null default '',
    student_report       text        not null default '',
    created_at           timestamptz not null default now()
);

-- 홈 화면 목록은 created_at 내림차순으로 조회하므로 인덱스 하나 얹어둔다.
create index if not exists citizen_reports_created_at_desc_idx
    on public.citizen_reports (created_at desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- 열람 전용 사이트이므로 anon / authenticated 에는 SELECT 만 허용한다.
-- INSERT / UPDATE / DELETE 정책은 만들지 않는다.
-- 쓰기 작업은 service_role 로 접속하는 Supabase 대시보드에서만 수행한다
-- (service_role 은 RLS 를 우회하므로 별도 정책 없이 그대로 동작한다).
-- ============================================================================

alter table public.citizen_reports enable row level security;

drop policy if exists citizen_reports_select_anon
    on public.citizen_reports;
create policy citizen_reports_select_anon
    on public.citizen_reports
    for select
    to anon
    using (true);

drop policy if exists citizen_reports_select_authenticated
    on public.citizen_reports;
create policy citizen_reports_select_authenticated
    on public.citizen_reports
    for select
    to authenticated
    using (true);


-- ============================================================================
-- 참고 (주석 처리): cr-check 저장소의 기존 리포트 한 건을 복사하는 예시
--
-- cr-check 의 analysis_results (리포트 본문) 과 articles (기사 메타데이터)
-- 두 테이블에 저장된 리포트를 citizen_reports 한 행으로 끌어와 시연/테스트
-- 데이터를 준비할 때 사용할 수 있다.
--
-- 실제 컬럼명은 cr-check 스키마에 따라 다를 수 있으므로, 필요하면 아래
-- SELECT 절의 컬럼명·매핑을 실제 상황에 맞게 조정한 뒤 실행한다.
-- <SHARE_ID_HERE> 자리에는 옮기려는 리포트의 share_id 를 넣는다.
-- ============================================================================
--
-- insert into public.citizen_reports (
--     share_id,
--     title,
--     url,
--     publisher,
--     journalist,
--     publish_date,
--     article_analysis,
--     comprehensive_report,
--     journalist_report,
--     student_report
-- )
-- select
--     ar.share_id,
--     a.title,
--     a.url,
--     a.publisher,
--     a.journalist,
--     a.publish_date,
--     jsonb_build_object(
--         'articleType',      a.article_type,
--         'articleElements',  a.article_elements,
--         'editStructure',    a.edit_structure,
--         'reportingMethod',  a.reporting_method,
--         'contentFlow',      a.content_flow
--     )                                       as article_analysis,
--     coalesce(ar.comprehensive_report, '')   as comprehensive_report,
--     coalesce(ar.journalist_report,    '')   as journalist_report,
--     coalesce(ar.student_report,       '')   as student_report
-- from public.analysis_results ar
-- join public.articles         a  on a.id = ar.article_id
-- where ar.share_id = '<SHARE_ID_HERE>'
-- on conflict (share_id) do nothing;

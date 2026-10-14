import { cache } from "react";
import type { AnalysisResult } from "@/types";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export interface CitizenReportRow {
  share_id: string;
  title: string;
  url: string;
  publisher: string | null;
  journalist: string | null;
  publish_date: string | null;
  article_analysis: Record<string, string | undefined> | null;
  comprehensive_report: string;
  journalist_report: string;
  student_report: string;
  created_at: string;
}

export interface CitizenReportListItem {
  share_id: string;
  title: string;
  publisher: string | null;
  publish_date: string | null;
  created_at: string;
}

/**
 * 홈 화면 검색용 항목. 클라이언트 필터가 훑는 필드(기자명·본문·원문 URL)까지
 * 함께 가져온다. sitemap 이 쓰는 CitizenReportListItem 은 건드리지 않는다.
 */
export interface CitizenReportSearchItem {
  share_id: string;
  title: string;
  publisher: string | null;
  journalist: string | null;
  publish_date: string | null;
  created_at: string;
  url: string;
  comprehensive_report: string;
}

function requireEnv(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "SUPABASE_URL 과 SUPABASE_ANON_KEY 환경변수를 반드시 설정해야 합니다."
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
}

async function supabaseSelect<T>(
  path: string,
  params: Record<string, string>
): Promise<T> {
  const { url, key } = requireEnv();
  const target = new URL(`${url}/rest/v1/${path}`);
  for (const [k, v] of Object.entries(params)) {
    target.searchParams.set(k, v);
  }

  // fetch 수준의 캐시 옵션을 두지 않는다. 갱신 주기는 이 함수를 부르는
  // 라우트의 revalidate 가 단독으로 정한다 — 두 곳에 각각 캐시를 두면
  // 어느 쪽이 오래된 값인지 알 수 없게 된다.
  const res = await fetch(target.toString(), {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase 요청 실패 (${res.status}): ${body}`);
  }

  return (await res.json()) as T;
}

export async function listCitizenReports(): Promise<CitizenReportListItem[]> {
  return supabaseSelect<CitizenReportListItem[]>("citizen_reports", {
    select: "share_id,title,publisher,publish_date,created_at",
    order: "created_at.desc",
  });
}

/** 홈 화면용 조회. 정렬 기준은 listCitizenReports 와 동일하다. */
export async function listCitizenReportsForSearch(): Promise<
  CitizenReportSearchItem[]
> {
  return supabaseSelect<CitizenReportSearchItem[]>("citizen_reports", {
    select:
      "share_id,title,publisher,journalist,publish_date,created_at,url,comprehensive_report",
    order: "created_at.desc",
  });
}

/**
 * 상세 화면이 읽는 컬럼. 공개 리포트(/report)와 미리보기(/preview)가 같은
 * 목록을 써서, 미리보기가 실제 페이지와 같은 내용을 보여 준다.
 * preview_token·is_published 는 넣지 않는다.
 */
const REPORT_DETAIL_COLUMNS =
  "share_id,title,url,publisher,journalist,publish_date,article_analysis,comprehensive_report,journalist_report,student_report,created_at";

export const getCitizenReport = cache(
  async (shareId: string): Promise<CitizenReportRow | null> => {
    const rows = await supabaseSelect<CitizenReportRow[]>("citizen_reports", {
      select: REPORT_DETAIL_COLUMNS,
      share_id: `eq.${shareId}`,
      limit: "1",
    });
    return rows[0] ?? null;
  }
);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 미리보기 코드(preview_token)가 맞는 리포트 한 건. 공개 여부와 상관없이
 * 읽는다 — DB 함수 get_report_preview 가 share_id 와 코드가 둘 다 맞을 때만
 * 그 행을 돌려준다.
 *
 * null 은 '없음'(→ 404)이다. 코드 형식이 틀렸거나, 응답이 정상이고 결과가
 * 빈 배열일 때만 돌려준다. 그 밖의 응답은 던진다. 형식은 호출 전에 걸렀으므로
 * 4xx 도 함수 누락·권한 변경 같은 실제 이상이고, 404 로 덮으면 드러나지 않는다.
 */
export const getCitizenReportPreview = cache(
  async (shareId: string, token: string): Promise<CitizenReportRow | null> => {
    // 형식이 틀린 코드를 보내면 PostgREST 가 400 을 낸다. DB 를 부르지 않는다.
    if (!UUID_PATTERN.test(token)) return null;

    const { url, key } = requireEnv();
    const target = new URL(`${url}/rest/v1/rpc/get_report_preview`);
    // 함수는 테이블 전체 컬럼을 돌려준다. 상세 화면 컬럼만 받아서 미리보기
    // 코드가 애초에 앱으로 들어오지 않게 한다.
    target.searchParams.set("select", REPORT_DETAIL_COLUMNS);

    // supabaseSelect 와 달리 fetch 를 캐시하지 않는다. 그쪽의 원칙(갱신 주기는
    // 라우트 revalidate 가 정한다)은 공개 페이지용이다. 미리보기는 대시보드에서
    // 고친 내용이 새로고침 즉시 보여야 하고, 라우트도 요청마다 렌더된다.
    const res = await fetch(target.toString(), {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_share_id: shareId, p_token: token }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Supabase 미리보기 요청 실패 (${res.status}): ${body}`);
    }

    const rows: unknown = await res.json();
    if (!Array.isArray(rows)) {
      throw new Error("Supabase 미리보기 응답이 배열이 아닙니다.");
    }
    return (rows[0] as CitizenReportRow | undefined) ?? null;
  }
);

export function formatIsoDateToKorean(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    // 서버 시간대(Vercel 은 UTC)와 무관하게 한국 날짜로 표시한다. 빼면
    // 한국시간 오전 9시 이전에 게재된 기사가 하루 앞 날짜로 보인다.
    timeZone: "Asia/Seoul",
  });
}

export function toAnalysisResult(row: CitizenReportRow): AnalysisResult {
  const analysis = row.article_analysis ?? {};
  return {
    article_info: {
      title: row.title,
      url: row.url,
      publisher: row.publisher ?? undefined,
      journalist: row.journalist ?? undefined,
      publishDate: formatIsoDateToKorean(row.publish_date),
      articleType: analysis.articleType,
      articleElements: analysis.articleElements,
      editStructure: analysis.editStructure,
      reportingMethod: analysis.reportingMethod,
      contentFlow: analysis.contentFlow,
    },
    reports: {
      comprehensive: row.comprehensive_report,
      journalist: row.journalist_report,
      student: row.student_report,
    },
    share_id: row.share_id,
    analyzed_at: row.created_at,
  };
}

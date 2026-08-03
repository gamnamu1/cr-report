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

  const res = await fetch(target.toString(), {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    cache: "no-store",
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

export const getCitizenReport = cache(
  async (shareId: string): Promise<CitizenReportRow | null> => {
    const rows = await supabaseSelect<CitizenReportRow[]>("citizen_reports", {
      select:
        "share_id,title,url,publisher,journalist,publish_date,article_analysis,comprehensive_report,journalist_report,student_report,created_at",
      share_id: `eq.${shareId}`,
      limit: "1",
    });
    return rows[0] ?? null;
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

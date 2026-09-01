import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ResultViewer } from "@/components/ResultViewer";
import { truncateShareTitle } from "@/lib/shareTitle";
import { SITE_URL_FROM_ENV } from "@/lib/site";
import { getCitizenReport, toAnalysisResult } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface ReportPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function resolveBaseUrl(): Promise<string> {
  // 정식 도메인이 설정돼 있으면 접속 호스트와 무관하게 그 값을 쓴다.
  // vercel.app 과 cr-report.kr 이 같은 리포트를 각각 색인하는 것을 막는다.
  if (SITE_URL_FROM_ENV) return SITE_URL_FROM_ENV;

  const h = await headers();
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const { id } = await params;
  const fallback: Metadata = { title: "Critical Readers 리포트" };

  const row = await getCitizenReport(id).catch((e) => {
    console.error("generateMetadata: Supabase fetch failed", e);
    return null;
  });
  if (!row) return fallback;

  const fullTitle = row.title || "게시된 리포트";
  const shortTitle = truncateShareTitle(row.title ?? "") || "게시된 리포트";
  const publisher = row.publisher || "";

  const description = publisher
    ? `${publisher} 기사에 대한 시민 비평 리포트`
    : "뉴스 기사에 대한 시민 비평 리포트";

  const baseUrl = await resolveBaseUrl();
  const canonicalUrl = `${baseUrl}/report/${encodeURIComponent(id)}`;

  return {
    title: `[Critical Readers] ${fullTitle}`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: shortTitle,
      description,
      type: "article",
      url: canonicalUrl,
      siteName: "Critical Readers",
    },
    twitter: {
      card: "summary",
      title: shortTitle,
      description,
    },
  };
}

export default async function ReportPage({
  params,
  searchParams,
}: ReportPageProps) {
  const { id } = await params;

  const row = await getCitizenReport(id);
  if (!row) notFound();

  const result = toAnalysisResult(row);

  // 목록에서 검색어를 달고 들어왔으면 "리포트 목록으로" 도 같은 검색어로 되돌린다.
  // canonical·공유 URL 은 q 없이 그대로 둔다(generateMetadata 참고).
  const { q } = await searchParams;
  const rawQuery = Array.isArray(q) ? q[0] : q;
  const listHref =
    rawQuery && rawQuery.trim() !== ""
      ? `/?${new URLSearchParams({ q: rawQuery }).toString()}`
      : "/";

  return <ResultViewer result={result} listHref={listHref} />;
}

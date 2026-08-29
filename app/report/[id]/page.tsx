import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ResultViewer } from "@/components/ResultViewer";
import { truncateShareTitle } from "@/lib/shareTitle";
import { getCitizenReport, toAnalysisResult } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

async function resolveBaseUrl(): Promise<string> {
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

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;

  const row = await getCitizenReport(id);
  if (!row) notFound();

  const result = toAnalysisResult(row);

  return <ResultViewer result={result} />;
}

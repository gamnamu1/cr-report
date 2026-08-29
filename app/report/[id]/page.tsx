import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ResultViewer } from "@/components/ResultViewer";
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

  const title = row.title || "게시된 리포트";
  const publisher = row.publisher || "";

  const ogTitle = `[Critical Readers] ${title}`;
  const description = publisher
    ? `${publisher} 기사에 대한 시민 검수 리포트`
    : "시민이 검수한 뉴스 비평 리포트";

  const baseUrl = await resolveBaseUrl();
  const canonicalUrl = `${baseUrl}/report/${encodeURIComponent(id)}`;

  return {
    title: ogTitle,
    description,
    openGraph: {
      title: ogTitle,
      description,
      type: "article",
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title: ogTitle,
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

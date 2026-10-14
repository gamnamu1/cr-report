import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ResultViewer } from "@/components/ResultViewer";
import { getCitizenReportPreview, toAnalysisResult } from "@/lib/supabase";

// 정적 생성·ISR 을 쓰지 않고 요청마다 렌더한다. 대시보드에서 고친 내용이
// 새로고침 즉시 보여야 하고, 미리보기 코드로 열린 화면을 캐시에 남기지 않는다.
export const dynamic = "force-dynamic";

interface PreviewPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 주소의 id 와 t(미리보기 코드)로 리포트를 읽는다. t 가 없거나 여러 개면
 * DB 를 부르지 않는다. generateMetadata 와 본문이 같은 인자로 부르므로
 * getCitizenReportPreview 의 cache() 가 조회를 한 번으로 줄인다.
 */
async function loadPreview({ params, searchParams }: PreviewPageProps) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  if (typeof t !== "string") return null;
  return getCitizenReportPreview(id, t);
}

// 색인에서 빼고, 주소에 든 미리보기 코드가 '원문 보기' 같은 외부 링크의
// Referer 로 전달되지 않게 한다. 루트 layout 에는 canonical 이 없고 openGraph
// 에도 url 이 없어서, 다른 페이지를 가리키는 값이 상속되지 않는다.
const PREVIEW_METADATA: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export async function generateMetadata(
  props: PreviewPageProps
): Promise<Metadata> {
  const row = await loadPreview(props).catch((e) => {
    console.error("generateMetadata: Supabase preview fetch failed", e);
    return null;
  });
  if (!row) return PREVIEW_METADATA;

  return { ...PREVIEW_METADATA, title: `[미리보기] ${row.title}` };
}

export default async function PreviewPage(props: PreviewPageProps) {
  const row = await loadPreview(props);
  // 코드가 틀렸는지, 리포트가 없는지 구분해 알리지 않는다(존재 여부를 숨긴다).
  if (!row) notFound();

  return <ResultViewer result={toAnalysisResult(row)} variant="preview" />;
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ResultViewer } from "@/components/ResultViewer";
import { truncateShareTitle } from "@/lib/shareTitle";
import { SITE_URL } from "@/lib/site";
import {
  getCitizenReport,
  listCitizenReports,
  toAnalysisResult,
} from "@/lib/supabase";

export const revalidate = 60;

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

/**
 * 게시된 리포트를 빌드 시점에 미리 생성한다.
 *
 * dynamicParams 기본값(true)을 그대로 두므로, 여기 없는 새 share_id 도
 * 첫 요청에서 생성돼 열린다. 목록을 여기 고정하는 것이 아니다.
 */
export async function generateStaticParams() {
  const reports = await listCitizenReports();
  return reports.map((report) => ({ id: report.share_id }));
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

  // headers() 를 읽으면 라우트가 동적이 되므로 정식 도메인 상수를 쓴다.
  // NEXT_PUBLIC_SITE_URL 이 비어 있으면 접속 호스트가 아니라 DEFAULT_SITE_URL
  // 이 canonical 이 된다(프로덕션은 환경변수가 설정돼 있어 차이가 없다).
  const canonicalUrl = `${SITE_URL}/report/${encodeURIComponent(id)}`;

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
      // openGraph 를 정의하면 루트 metadata 의 것을 상속하지 않고 통째로
      // 대체하므로, locale·images 를 여기서도 명시한다.
      locale: "ko_KR",
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: "Critical Readers",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: shortTitle,
      description,
      images: ["/og-image.jpg"],
    },
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;

  const row = await getCitizenReport(id);
  if (!row) notFound();

  const result = toAnalysisResult(row);

  // searchParams 를 서버에서 읽으면 라우트가 동적이 된다. "리포트 목록으로" 가
  // 검색어를 되돌리는 일은 ResultViewer 가 클라이언트에서 q 를 읽어 처리한다.
  // canonical·공유 URL 은 q 없이 그대로 둔다(generateMetadata 참고).
  return <ResultViewer result={result} />;
}

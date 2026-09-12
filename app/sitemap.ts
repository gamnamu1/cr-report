import type { MetadataRoute } from "next";

import { ANALYZE_PUBLIC } from "@/lib/flags";
import { SITE_URL } from "@/lib/site";
import { listCitizenReports } from "@/lib/supabase";

// 빌드 시점에 생성하고 60초마다 재검증한다. 재검증은 그 뒤 들어온 요청이
// 유발하며, 그 요청은 이전 sitemap 을 받는다.
export const revalidate = 60;

function toLastModified(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 조회 오류를 0건으로 삼키지 않는다. 재검증 중 실패하면 Next 가 직전
  // sitemap 을 계속 제공하고, 빌드 시점에 실패하면 빌드가 실패한다.
  const reports = await listCitizenReports();

  const entries: MetadataRoute.Sitemap = [
    {
      // canonical(app/page.tsx)과 정확히 같은 형태로 맞춘다.
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  // 선언문은 플래그와 무관하게 항상 색인 대상이다.
  entries.push({
    url: `${SITE_URL}/declaration`,
    changeFrequency: "monthly",
    priority: 0.7,
  });

  // /analyze 는 공개 플래그가 켜졌을 때만 sitemap 에 올린다.
  // (페이지 자체는 플래그와 무관하게 접근 가능하지만, 색인 유도는 하지 않는다.)
  if (ANALYZE_PUBLIC) {
    entries.push({
      url: `${SITE_URL}/analyze`,
      changeFrequency: "monthly",
      priority: 0.9,
    });
  }

  for (const report of reports) {
    entries.push({
      url: `${SITE_URL}/report/${encodeURIComponent(report.share_id)}`,
      lastModified: toLastModified(report.created_at),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  return entries;
}

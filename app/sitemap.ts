import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { listCitizenReports } from "@/lib/supabase";

// 리포트 목록은 Supabase 를 매 요청 조회하므로 정적 생성하지 않는다.
export const dynamic = "force-dynamic";

function toLastModified(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Supabase 가 실패해도 sitemap 자체는 응답한다 (홈만 담긴 채로).
  const reports = await listCitizenReports().catch((e) => {
    console.error("sitemap: Supabase fetch failed", e);
    return [];
  });

  const entries: MetadataRoute.Sitemap = [
    {
      // canonical(app/page.tsx)과 정확히 같은 형태로 맞춘다.
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

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

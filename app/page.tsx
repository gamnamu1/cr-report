import type { Metadata } from "next";
import {
  SearchableReportList,
  type ReportListItem,
} from "@/components/SearchableReportList";
import { SiteFooter } from "@/components/SiteFooter";
import { ANALYZE_PUBLIC } from "@/lib/flags";
import {
  formatIsoDateToKorean,
  listCitizenReportsForSearch,
} from "@/lib/supabase";

// 조정 가능한 값 3개: span 크기 0.85em · span 농도 /55 (바로 아래 줄),
// h1 전체 농도 text-navy-900/70 (아래 h1 태그). 농도는 색상 알파라 서로 독립적이다.
const soft = "text-[0.85em] text-navy-900/55";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // 접속 호스트와 무관하게 정식 도메인 하나로 색인을 모은다.
  // app/layout.tsx 의 metadataBase 기준으로 해석된다.
  alternates: {
    canonical: "/",
  },
};

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // 목록 조회는 q 와 무관하게 항상 전체다. 필터는 클라이언트에서만 일어난다.
  const reports = await listCitizenReportsForSearch();

  const { q } = await searchParams;
  const rawQuery = Array.isArray(q) ? q[0] : q;
  // 빈 값·공백뿐인 값은 초기 검색어로 취급하지 않는다.
  const initialQuery = rawQuery && rawQuery.trim() !== "" ? rawQuery : "";

  // 게재일 포맷은 서버에서 끝낸다. 클라이언트 컴포넌트가 lib/supabase 를
  // 런타임 import 하지 않도록 문자열로 만들어 내려보낸다.
  const items: ReportListItem[] = reports.map((report) => ({
    share_id: report.share_id,
    title: report.title,
    publisher: report.publisher,
    journalist: report.journalist,
    url: report.url,
    comprehensive_report: report.comprehensive_report,
    publishDateLabel: formatIsoDateToKorean(report.publish_date),
  }));

  return (
    // 배경 그라디언트는 이 wrapper 가 소유한다. main 에 남겨두면 풋터 영역만
    // 흰색으로 뜬다. 세로 flex 라 내용이 짧아도 풋터가 화면 하단에 자리한다.
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-navy-50 via-white to-amber-50">
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-16">
          {/* 아래쪽 간격은 SearchableReportList 가 소유한다(형제 마진 병합 주의). */}
          <header className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-navy-900/70 mb-3">
              C<span className={soft}>ritical</span>{" "}
              R<span className={soft}>eaders</span>
            </h1>
            <p className="text-navy-700 text-base md:text-lg leading-relaxed">
              언론은 시민을 위해 존재하며, 시민의 신뢰는 언론의 가장 소중한
              자산이다.{" "}
              <span className="text-[0.8em] opacity-80">
                - 언론윤리헌장 중에서
              </span>
            </p>
          </header>

          <SearchableReportList reports={items} initialQuery={initialQuery} />
        </div>
      </main>

      {/* 플래그가 꺼져 있으면 홈에서는 풋터 자체를 렌더링하지 않는다. */}
      {ANALYZE_PUBLIC && <SiteFooter analyzePublic={ANALYZE_PUBLIC} />}
    </div>
  );
}

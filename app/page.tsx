import type { Metadata } from "next";
import Link from "next/link";
import {
  formatIsoDateToKorean,
  listCitizenReports,
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

export default async function HomePage() {
  const reports = await listCitizenReports();

  return (
    <main className="min-h-screen bg-gradient-to-br from-navy-50 via-white to-amber-50">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-navy-900/70 mb-3">
            C<span className={soft}>ritical</span>{" "}
            R<span className={soft}>eaders</span>
          </h1>
          <p className="text-navy-700 text-base md:text-lg leading-relaxed">
            언론은 시민을 위해 존재하며, 시민의 신뢰는 언론의 가장 소중한
            자산이다.{" "}
            <span className="text-[0.8em] opacity-80">- 언론윤리헌장 중에서</span>
          </p>
        </header>

        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-12 text-center">
            <p className="text-navy-600 text-lg">준비 중입니다.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {reports.map((report) => (
              <li key={report.share_id}>
                <Link
                  href={`/report/${encodeURIComponent(report.share_id)}`}
                  className="block bg-white rounded-xl shadow-sm border border-navy-100 p-6 hover:shadow-md hover:border-navy-200 transition-all"
                >
                  <h2 className="text-navy-900 font-semibold text-lg md:text-xl mb-2 line-clamp-2">
                    {report.title || "제목 미확인"}
                  </h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-navy-600">
                    <span>{report.publisher || "매체 미확인"}</span>
                    {report.publish_date && (
                      <span>
                        게재일 {formatIsoDateToKorean(report.publish_date)}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

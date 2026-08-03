import Link from "next/link";
import {
  formatIsoDateToKorean,
  listCitizenReports,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const reports = await listCitizenReports();

  return (
    <main className="min-h-screen bg-gradient-to-br from-navy-50 via-white to-amber-50">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-navy-900 mb-3">
            citizen-reviewers
          </h1>
          <p className="text-navy-700 text-base md:text-lg leading-relaxed">
            시민이 검수한 뉴스 비평 리포트를 모아 두는 열람 전용 공간입니다.
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

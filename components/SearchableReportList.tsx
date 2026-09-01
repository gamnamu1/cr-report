"use client";

import { useState } from "react";
import Link from "next/link";

import { ExpandingSearch } from "./ExpandingSearch";

/** 카드 렌더와 클라이언트 필터에 필요한 값만 담은 항목. */
export interface ReportListItem {
  share_id: string;
  title: string;
  publisher: string | null;
  journalist: string | null;
  url: string;
  comprehensive_report: string;
  /** 서버에서 미리 포맷한 게재일. 게재일이 없으면 빈 문자열. */
  publishDateLabel: string;
}

interface SearchableReportListProps {
  /** created_at 내림차순으로 정렬된 전체 목록. */
  reports: ReportListItem[];
}

/**
 * 검색어 state 의 소유자이자 목록 렌더러.
 *
 * 필터는 전적으로 클라이언트에서 일어난다. 입력해도 재조회하지 않고,
 * 서버가 내려준 배열을 그대로 걸러 보여준다.
 *
 * 검색창 위(mt-6)와 목록 위(mt-9) 간격을 이 컴포넌트가 소유한다.
 * app/page.tsx 의 header 에 margin 을 두면 형제 마진 병합으로
 * 인용문↔검색창 간격이 벌어진다.
 */
export function SearchableReportList({ reports }: SearchableReportListProps) {
  const [query, setQuery] = useState("");

  // 필터와 이후 판단은 모두 이 값 하나만 본다.
  const normalizedQuery = query.trim().toLowerCase();

  const visibleReports =
    normalizedQuery === ""
      ? reports
      : reports.filter((report) =>
          [
            report.title,
            report.publisher,
            report.journalist,
            report.comprehensive_report,
            report.url,
          ].some((field) =>
            (field ?? "").toLowerCase().includes(normalizedQuery)
          )
        );

  const hasVisibleReports = visibleReports.length > 0;

  // 화면 갱신을 스크린리더에 알리는 문구. 검색 전과, 아카이브 자체가 빈
  // 상태("준비 중입니다.")에서는 빈 문자열로 둔다.
  const searchStatus =
    reports.length === 0 || normalizedQuery === ""
      ? ""
      : hasVisibleReports
        ? `${visibleReports.length}개의 리포트를 찾았습니다.`
        : "검색 결과가 없습니다.";

  return (
    <div className="mt-6">
      <ExpandingSearch value={query} onChange={setQuery} />

      {/* 항상 마운트해 두고 텍스트만 갱신한다(조건부 렌더 시 낭독되지 않는다). */}
      <p className="sr-only" aria-live="polite">
        {searchStatus}
      </p>

      <div className="mt-9">
        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-12 text-center">
            <p className="text-navy-600 text-lg">준비 중입니다.</p>
          </div>
        ) : hasVisibleReports ? (
          <ul className="space-y-4">
            {visibleReports.map((report) => (
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
                    {report.publishDateLabel && (
                      <span>게재일 {report.publishDateLabel}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

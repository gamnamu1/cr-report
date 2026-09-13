"use client";

import { Fragment, Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { normalizeSearchText } from "@/lib/reportSearch";

import { ExpandingSearch } from "./ExpandingSearch";

/**
 * 검색 범위 안내. 공백이 아닌 검색어가 있는 동안 검색창 아래에 늘 같은 문구로
 * 보인다. 이름을 감지했다는 알림이 아니라 검색 범위 설명이라, 매체명·기자명을
 * 넣든 일반 주제어를 넣든 문구가 같다.
 *
 * 좁은 화면에서 의미와 무관한 자리에서 끊기지 않도록 구절 단위로 나눠 둔다.
 * 한 칸 공백으로 이으면 기존 문구와 정확히 같다 — 문구 자체는 바꾸지 않았다.
 */
const SEARCH_SCOPE_NOTE_LINES = [
  "기사 내용에 집중할 수 있도록",
  "매체명·기자명은 검색 대상에서 제외했어요.",
  "주제나 내용으로 찾아보세요.",
] as const;

/** 위 안내문의 id. 입력란과 aria-describedby 로 잇는다. */
const SEARCH_SCOPE_NOTE_ID = "report-search-scope-note";

/**
 * 카드 렌더와 클라이언트 필터에 필요한 값만 담은 항목.
 *
 * 원본 `journalist`·`url`·`comprehensive_report` 는 여기 없다. 카드가 쓰지
 * 않고, 검색은 `searchText` 하나만 보기 때문이다. 표시용 `title`·`publisher`
 * 는 화면에만 쓰고 검색 비교에 다시 합치지 않는다.
 */
export interface ReportListItem {
  share_id: string;
  title: string;
  publisher: string | null;
  /** 서버에서 미리 포맷한 게재일. 게재일이 없으면 빈 문자열. */
  publishDateLabel: string;
  /**
   * 서버(app/page.tsx)가 lib/reportSearch 로 만든 검색 전용 텍스트.
   * 이미 정규화(NFKC·소문자·공백 정리)까지 끝나 있다.
   */
  searchText: string;
}

interface SearchableReportListProps {
  /** created_at 내림차순으로 정렬된 전체 목록. */
  reports: ReportListItem[];
}

/**
 * 주소창의 `q` 를 읽어 부모의 setter 만 호출하는 자식. 아무것도 렌더하지 않는다.
 *
 * 홈이 정적 생성되므로 서버는 더 이상 searchParams 를 읽지 않는다. useSearchParams
 * 는 Suspense 경계 안에서만 쓸 수 있고 경계 안쪽은 정적 HTML 에 담기지 않으므로,
 * 목록 본체가 아니라 이 빈 컴포넌트만 경계 안에 둔다. 목록 본체를 안에 넣으면
 * 정적 HTML 에서 리포트 목록이 사라진다.
 */
function QuerySync({ onQuery }: { onQuery: (next: string) => void }) {
  const searchParams = useSearchParams();
  const raw = searchParams.get("q") ?? "";
  // 빈 값·공백뿐인 값은 검색어로 취급하지 않는다(서버가 하던 정규화와 같다).
  const q = raw.trim() === "" ? "" : raw;

  // 최초 마운트뿐 아니라 q 가 바뀔 때마다 동기화한다.
  useEffect(() => {
    onQuery(q);
  }, [q, onQuery]);

  return null;
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

  // 주소창의 q 를 state 에 반영한다. 같은 값이면 아무 일도 하지 않는다 —
  // handleQueryChange 가 replaceState 로 쓴 값이 useSearchParams 에 반영돼
  // 돌아올 수 있는데, 그때 state 를 다시 쓰면 타이핑 중 입력이 되돌아간다.
  const syncQueryFromUrl = useCallback((next: string) => {
    setQuery((prev) => (prev === next ? prev : next));
  }, []);

  // 필터와 이후 판단은 모두 이 값 하나만 본다. searchText 와 똑같은 정규화를
  // 써야 비교가 어긋나지 않으므로 lib/reportSearch 의 함수를 그대로 쓴다.
  const normalizedQuery = normalizeSearchText(query);

  // 공백으로 나눈 토큰을 모두 만족해야 한다(AND).
  const tokens =
    normalizedQuery === "" ? [] : normalizedQuery.split(" ").filter(Boolean);

  const visibleReports =
    tokens.length === 0
      ? reports
      : reports.filter((report) =>
          // searchText 이외의 필드는 검색에 합치지 않는다. 표시용 제목·매체명을
          // 다시 더하면 매체명 제외가 무의미해진다.
          tokens.every((token) => report.searchText.includes(token))
        );

  // 검색어를 주소창에 반영한다. 히스토리 항목을 쌓지 않도록 replaceState 를 쓰고,
  // Next 라우터가 쓰는 기존 history state 는 그대로 보존한다.
  function handleQueryChange(next: string) {
    setQuery(next);

    const url = new URL(window.location.href);
    if (next.trim() === "") url.searchParams.delete("q");
    else url.searchParams.set("q", next);
    window.history.replaceState(window.history.state, "", url);
  }

  const hasVisibleReports = visibleReports.length > 0;

  // 공백이 아닌 검색어가 있는 동안에만 안내를 띄운다. 아카이브가 비어 있을
  // 때("준비 중입니다.")는 검색 자체가 의미 없으므로 띄우지 않는다.
  const showScopeNote = reports.length > 0 && normalizedQuery !== "";

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
      <Suspense fallback={null}>
        <QuerySync onQuery={syncQueryFromUrl} />
      </Suspense>

      <ExpandingSearch
        value={query}
        onChange={handleQueryChange}
        // 안내문이 없을 때 매달린 id 를 남기지 않는다.
        describedById={showScopeNote ? SEARCH_SCOPE_NOTE_ID : undefined}
      />

      {/* 일반 보조 설명이다. aria-live 영역이 아니라서 타이핑마다 다시 낭독되지
          않고, 입력란에서는 aria-describedby 로 한 번 읽힌다. */}
      {showScopeNote && (
        <p
          id={SEARCH_SCOPE_NOTE_ID}
          className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-navy-600"
        >
          {SEARCH_SCOPE_NOTE_LINES.map((line, index) => (
            <Fragment key={line}>
              {/* 구절 사이의 공백은 실제 텍스트 노드여야 한다. 없으면 sm 이상에서
                  낱말이 붙고 aria-describedby 로 읽히는 설명도 함께 붙는다. */}
              {index > 0 && " "}
              <span className="block sm:inline">{line}</span>
            </Fragment>
          ))}
        </p>
      )}

      {/* 항상 마운트해 두고 텍스트만 갱신한다(조건부 렌더 시 낭독되지 않는다). */}
      <p className="sr-only" aria-live="polite">
        {searchStatus}
      </p>

      <div className="mt-9">
        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-12 text-center">
            <p className="text-navy-600 text-lg">준비 중입니다.</p>
          </div>
        ) : !hasVisibleReports ? (
          <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-12 text-center">
            <p className="text-navy-600 text-lg">
              검색 결과가 없어요. 다른 검색어로 찾아보세요.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {visibleReports.map((report) => (
              <li key={report.share_id}>
                <Link
                  // 검색 중에는 같은 q 를 달아 상세에서 목록으로 돌아올 수 있게 한다.
                  href={
                    normalizedQuery === ""
                      ? `/report/${encodeURIComponent(report.share_id)}`
                      : {
                          pathname: `/report/${encodeURIComponent(
                            report.share_id
                          )}`,
                          query: { q: query },
                        }
                  }
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
        )}
      </div>
    </div>
  );
}

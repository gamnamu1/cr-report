"use client";

import { useState } from "react";

import { ExpandingSearch } from "./ExpandingSearch";

/**
 * 검색어 state 의 소유자.
 *
 * 1단계에서는 검색창만 렌더한다. 목록은 아직 app/page.tsx 의 서버 컴포넌트가
 * 그대로 그리며, 다음 단계에서 이 래퍼로 옮겨 query 로 필터링한다.
 */
export function SearchableReportList() {
  const [query, setQuery] = useState("");

  return (
    <div className="mt-6">
      <ExpandingSearch value={query} onChange={setQuery} />
    </div>
  );
}

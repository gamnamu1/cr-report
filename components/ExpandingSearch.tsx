"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface ExpandingSearchProps {
  /** 검색어. state 는 상위 컴포넌트가 소유한다(controlled). */
  value: string;
  onChange: (v: string) => void;
}

/**
 * 접힘 상태에서는 작은 돋보기 원, 열면 아이콘 위치를 축으로 양옆 대칭으로
 * 펼쳐지는 검색 입력.
 *
 * - 바깥 행의 높이가 40px 로 고정돼 있어 접힘/펼침이 아래 콘텐츠를 밀지 않는다.
 *   (오버레이·absolute 대신 컨테이너 width 만 transition 한다.)
 * - 검색어 상태와 URL(?q=) 반영은 상위 컴포넌트가 담당한다. 이 컴포넌트 자신은
 *   localStorage·sessionStorage·analytics 어디에도 검색어를 기록하지 않는다.
 */
export function ExpandingSearch({ value, onChange }: ExpandingSearchProps) {
  // ?q= 로 진입해 초기 검색어가 있으면 펼친 채로 시작한다.
  const [expanded, setExpanded] = useState(() => value !== "");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 사용자가 버튼으로 직접 열었을 때만 true. ?q= 진입·복원처럼 펼친 채로
  // 시작하는 경우에는 포커스를 옮기지 않는다.
  const focusOnExpandRef = useRef(false);

  // 펼쳐지면 곧바로 입력할 수 있게 포커스를 넘긴다.
  // input 은 접힘 상태에서 disabled 라, re-render 뒤인 effect 에서 호출해야 한다.
  useEffect(() => {
    if (!expanded || !focusOnExpandRef.current) return;
    focusOnExpandRef.current = false;
    inputRef.current?.focus();
  }, [expanded]);

  // 수축 판정. React 의 onBlur 는 focusout 이라 자식에서 버블링된다.
  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    // 버튼 ↔ input ↔ X 처럼 컴포넌트 내부 이동은 수축 조건이 아니다.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    // 검색어가 남아 있으면 포커스가 나가도 펼침을 유지한다.
    if (value.length > 0) return;
    setExpanded(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Escape") return;
    e.preventDefault();
    onChange("");
    setExpanded(false);
    // 버튼은 접힘/펼침 양쪽에서 항상 마운트돼 있으므로 바로 포커스를 되돌린다.
    buttonRef.current?.focus();
  }

  return (
    // 높이 고정 행. 폭만 변하고 위아래 레이아웃은 그대로다.
    <div
      className="flex h-10 justify-center"
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <div
        className={[
          "flex h-10 items-center overflow-hidden rounded-full border",
          // tailwindcss-animate 가 duration-*/ease-* 를 animation-* 용으로도 정의해
          // 두 유틸리티의 임의값(대괄호 표기)은 ambiguous 로 판정돼 버려진다.
          // transition 단축 속성을 통째로 지정해 충돌을 피한다.
          "[transition:all_250ms_ease] motion-reduce:[transition:none]",
          expanded
            ? "w-[min(340px,85vw)] border-navy-200 bg-white shadow-sm focus-within:border-navy-300"
            : "w-10 border-transparent bg-transparent",
        ].join(" ")}
      >
        <button
          ref={buttonRef}
          type="button"
          aria-label="리포트 검색"
          aria-expanded={expanded}
          // 펼친 뒤에는 input 앞의 장식 아이콘 역할이라 탭 순서에서 뺀다.
          // (tabIndex -1 이어도 ESC 의 프로그램적 포커스는 그대로 받는다.)
          tabIndex={expanded ? -1 : undefined}
          onMouseDown={(e) => {
            // 펼친 상태에서 아이콘을 눌러도 input 의 포커스를 뺏지 않는다.
            if (expanded) e.preventDefault();
          }}
          onClick={() => {
            if (expanded) {
              inputRef.current?.focus();
              return;
            }
            focusOnExpandRef.current = true;
            setExpanded(true);
          }}
          // 보이는 원은 25px, 실제 히트 영역은 투명하게 40px.
          className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full outline-none"
        >
          <span
            className={[
              "flex h-[25px] w-[25px] items-center justify-center rounded-full border",
              "transition-colors motion-reduce:transition-none",
              "group-focus-visible:ring-2 group-focus-visible:ring-navy-300",
              expanded
                ? "border-transparent text-navy-500"
                : "border-navy-200 bg-white/70 text-navy-500 group-hover:border-navy-300 group-hover:text-navy-700",
            ].join(" ")}
          >
            <Search className="h-[13px] w-[13px]" aria-hidden="true" />
          </span>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // 접힘 상태에서는 클리핑만 되고 탭 순서에는 남지 않도록 막는다.
          disabled={!expanded}
          aria-hidden={!expanded}
          aria-label="리포트 검색"
          placeholder="기사 제목·리포트 내용으로 찾기"
          autoComplete="off"
          // 16px 미만이면 iOS 가 포커스 시 화면을 확대한다.
          className="min-w-0 flex-1 bg-transparent pr-1 text-left text-[16px] text-navy-900 outline-none placeholder:text-navy-400"
        />

        {value.length > 0 && (
          <button
            type="button"
            aria-label="검색어 지우기"
            // 포커스를 input 에 둔 채로 지운다(수축 판정도 건드리지 않는다).
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="flex h-10 w-8 shrink-0 items-center justify-center rounded-full text-navy-400 outline-none transition-colors hover:text-navy-700 focus-visible:ring-2 focus-visible:ring-navy-300 motion-reduce:transition-none"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

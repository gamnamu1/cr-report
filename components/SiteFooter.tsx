"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 스크롤 방향에 따른 자동 숨김 스위치.
 *
 * `false` 로 바꾸면 **자동 숨김만** 꺼진다. 화면 하단 고정, 본문 여백, 메뉴,
 * 메일 모달, 입력·포커스 예외는 그대로 동작한다. 환경변수나 설정 화면을 두지
 * 않고 이 상수 하나로만 전환한다.
 */
const AUTO_HIDE_ON_SCROLL = true;

/** 이 높이 안쪽(페이지 상단)에서는 방향과 무관하게 표시한다. */
const TOP_ZONE_PX = 80;
/** 한 방향으로 이만큼 누적해 움직여야 표시/숨김을 바꾼다. 미세한 떨림 방지. */
const SCROLL_THRESHOLD_PX = 12;
/** 페이지 최하단 이 높이 안쪽에서는 표시한다. */
const BOTTOM_ZONE_PX = 16;

/**
 * 슬라이드 전환. transform 만 180ms 로 움직이고, 동작 줄이기 설정에서는 즉시
 * 바뀐다. Tailwind 가 클래스 문자열을 정적으로 훑으므로 180ms 는 여기에 직접
 * 적는다(상수로 빼면 클래스가 생성되지 않는다). `duration-*` 유틸리티는
 * tailwindcss-animate 와 겹쳐 임의값이 버려지므로 transition 단축 속성을 쓴다 —
 * ExpandingSearch 와 같은 이유다.
 */
const FOOTER_TRANSITION_CLASS =
  "[transition:transform_180ms_ease-out] motion-reduce:[transition:none]";

/**
 * 측정 전에 쓰는 여백 높이. 서버와 클라이언트 첫 렌더가 같아야 하므로 고정값이다.
 *
 * 실제 높이와 같은 공식을 따른다 — 고정분(위 여백 0.625rem + 메뉴 한 줄) 에
 * 아래 여백 `max(0.625rem, env(safe-area-inset-bottom))` 을 더한다.
 * 고정분 2.5675rem 은 안전영역 0·기본 글자 크기에서 실측한 풋터 높이
 * 51.08px 에서 아래 여백 0.625rem(10px) 을 뺀 값이다(41.08px).
 *
 * 이 값은 첫 페인트용 근삿값일 뿐이다. 마운트 직후 ResizeObserver 가 잰
 * 실제 높이가 인라인 style 로 덮어쓰므로, 글자 확대·줄바꿈은 고정값에 갇히지
 * 않는다.
 */
const FALLBACK_SPACER_CLASS =
  "h-[calc(2.5675rem+max(0.625rem,env(safe-area-inset-bottom)))]";

/** 완성한 리포트를 받는 주소. 모달 안에도 텍스트로 그대로 보여준다(육안 폴백). */
const REPORT_EMAIL = "report@cr-report.kr";

/**
 * 포커스가 들어가면 메뉴를 숨길 '진짜 텍스트 입력' 판정 대상.
 * 버튼·체크박스·라디오는 포함하지 않는다.
 */
const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "url",
  "email",
  "tel",
  "password",
  "number",
]);

type CopyState = "success" | "failure";

const MODAL_COPY: Record<
  CopyState,
  { title: string; guide: string[]; note?: string }
> = {
  success: {
    title: "메일 주소가 복사되었어요",
    guide: [
      "완성한 리포트를 보내 주세요.",
      "아카이브에 올려 함께 공유할 수 있어요.",
    ],
    note: "(이름·아이디·메일 주소는 공개하지 않아요)",
  },
  failure: {
    title: "자동 복사가 안 됐어요",
    guide: ["위 메일 주소를 길게 눌러 직접 복사해 주세요."],
  },
};

/**
 * 풋터 항목 공통 스타일. 현재 페이지는 목업 `footer a.here` 와 같이 진하게 둔다.
 * 글자 크기는 목업처럼 컨테이너(0.92rem)에서 상속받는다.
 */
function itemClass(active: boolean): string {
  return [
    "rounded px-1 py-1 outline-none transition-colors",
    "focus-visible:ring-2 focus-visible:ring-navy-300",
    "motion-reduce:transition-none",
    active ? "text-navy-900" : "text-navy-600 hover:text-navy-900",
  ].join(" ");
}

/** 텍스트를 입력하는 요소인지. 모바일 키보드와 겹치는 것을 피하기 위한 판정이다. */
function isTextInputElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }
  if (element instanceof HTMLInputElement) {
    return (
      TEXT_INPUT_TYPES.has(element.type) && !element.disabled && !element.readOnly
    );
  }
  return false;
}

interface SiteFooterProps {
  /**
   * 서버에서 읽은 ANALYZE_PUBLIC 값. false 면 '리포트 만들기' 링크를 렌더링하지
   * 않는다. 이 컴포넌트가 받는 prop 은 이것 하나뿐이다.
   */
  analyzePublic: boolean;
}

/**
 * 사이트 공통 풋터. 항목 4개(ANALYZE_PUBLIC 이 꺼지면 3개)를 가운데 정렬로
 * 배치한다. © 표기는 없다.
 *
 * 화면 하단에 고정되고, 아래로 스크롤하면 숨고 위로 스크롤하면 다시 나온다.
 * 세 요소로 이루어진다.
 *
 *  1. 본문 흐름 안의 여백 — 실제 메뉴 높이만큼 자리를 잡아 마지막 본문이 바에
 *     가리지 않게 한다. 표시·숨김 중에도 높이를 바꾸지 않는다(바꾸면 페이지
 *     높이가 흔들려 방향 판정이 되뒤집힌다).
 *  2. 고정 메뉴 — 메뉴는 한 번만 렌더링하고, transform 은 **여기에만** 건다.
 *  3. 메일 모달 — transform 바깥의 형제다. transform 이 걸린 조상 안에 있으면
 *     `position: fixed` 의 기준이 그 조상으로 바뀌어 화면 중앙에 서지 못한다.
 *
 * '리포트 보내기'는 페이지 이동이 아니므로 button 이다. mailto: 를 열지 않고
 * 받는 주소를 클립보드에 복사한 뒤 안내 모달을 띄운다.
 */
export function SiteFooter({ analyzePublic }: SiteFooterProps) {
  const pathname = usePathname();
  // null 이면 모달이 닫힌 상태. 복사 성공/실패에 따라 모달 문구가 갈린다.
  const [copyState, setCopyState] = useState<CopyState | null>(null);
  // 모달을 닫을 때 포커스를 되돌릴 대상.
  const reportButtonRef = useRef<HTMLButtonElement>(null);

  const footerRef = useRef<HTMLElement>(null);
  // 측정 전에는 null. 서버 렌더와 클라이언트 첫 렌더가 같아야 하므로 이 값으로
  // 시작하고, 마운트 뒤 실제 높이로 바꾼다(window 를 렌더 중에 읽지 않는다).
  const [footerHeight, setFooterHeight] = useState<number | null>(null);

  const [scrollVisible, setScrollVisible] = useState(true);
  const [footerFocused, setFooterFocused] = useState(false);
  const [textInputFocused, setTextInputFocused] = useState(false);

  // ---- 표시 판단 (계획서 2.3 우선순위) --------------------------------
  // 1. 모달이 열려 있거나 풋터 안에 포커스가 있으면 표시를 유지한다.
  const showLocked = copyState !== null || footerFocused;
  // 2. 풋터 밖 텍스트 입력에 포커스가 있으면 숨긴다.
  const hideLocked = !showLocked && textInputFocused;
  // 3·4. 나머지는 스크롤 판정(상단·하단·비스크롤 예외 포함)을 따른다.
  const visible = showLocked ? true : hideLocked ? false : scrollVisible;

  const scrollVisibleRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const accumulatedRef = useRef(0);
  const lockedRef = useRef(false);

  /** 상태가 실제로 바뀔 때만 갱신한다. */
  const applyScrollVisible = useCallback((next: boolean) => {
    if (scrollVisibleRef.current === next) return;
    scrollVisibleRef.current = next;
    setScrollVisible(next);
  }, []);

  /** 탄성 스크롤(위·아래 바운스)을 유효 범위로 보정해 읽는다. */
  const readScroll = useCallback(() => {
    const doc = document.documentElement;
    const maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
    const y = Math.min(Math.max(window.scrollY, 0), maxScroll);
    return { y, maxScroll };
  }, []);

  /** 기준점을 현재 위치로 옮기고 누적을 버린다. */
  const resetBaseline = useCallback(() => {
    lastScrollYRef.current = readScroll().y;
    accumulatedRef.current = 0;
  }, [readScroll]);

  const evaluate = useCallback(() => {
    const { y, maxScroll } = readScroll();

    // 잠금(모달·포커스) 중에는 방향을 누적하지 않는다. 잠금이 풀릴 때 그동안의
    // 오래된 차이가 뒤늦게 적용되지 않도록 기준점만 따라 옮긴다.
    if (lockedRef.current) {
      lastScrollYRef.current = y;
      accumulatedRef.current = 0;
      return;
    }

    // 상단·최하단·스크롤할 내용이 없는 화면에서는 언제나 표시한다.
    if (
      maxScroll <= 0 ||
      y <= TOP_ZONE_PX ||
      y >= maxScroll - BOTTOM_ZONE_PX
    ) {
      lastScrollYRef.current = y;
      accumulatedRef.current = 0;
      applyScrollVisible(true);
      return;
    }

    if (!AUTO_HIDE_ON_SCROLL) {
      lastScrollYRef.current = y;
      return;
    }

    const delta = y - lastScrollYRef.current;
    lastScrollYRef.current = y;
    if (delta === 0) return;

    // 방향이 바뀌면 반대 방향 누적값을 버리고 새 방향만 쌓는다.
    if (delta > 0 !== accumulatedRef.current > 0) accumulatedRef.current = 0;
    accumulatedRef.current += delta;

    if (accumulatedRef.current >= SCROLL_THRESHOLD_PX) {
      accumulatedRef.current = 0;
      applyScrollVisible(false);
    } else if (accumulatedRef.current <= -SCROLL_THRESHOLD_PX) {
      accumulatedRef.current = 0;
      applyScrollVisible(true);
    }
  }, [applyScrollVisible, readScroll]);

  // 스크롤·창 크기. 스크롤은 passive 로 듣는다.
  useEffect(() => {
    resetBaseline();
    evaluate();

    const handleScroll = () => evaluate();
    const handleResize = () => {
      resetBaseline();
      evaluate();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [evaluate, resetBaseline]);

  // 검색 등으로 본문 높이가 변하는 경우. 사용자가 스크롤한 것이 아니므로
  // 방향으로 읽지 않고 기준점만 새로 잡은 뒤 예외 규칙을 다시 따진다.
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      resetBaseline();
      evaluate();
    });
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [evaluate, resetBaseline]);

  // 실제 메뉴 높이를 재서 여백에 반영한다. 같은 값이면 다시 설정하지 않는다
  // (관찰 콜백이 자기 자신을 다시 부르는 루프를 만들지 않기 위해).
  useEffect(() => {
    const element = footerRef.current;
    if (!element) return;

    const measure = () => {
      const next = Math.round(element.getBoundingClientRect().height);
      setFooterHeight((prev) => (prev === next ? prev : next));
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 여백만으로는 중간 위치의 키보드 포커스 가림까지 막지 못한다. 브라우저가
  // 포커스를 화면에 넣을 때 고정 바 높이만큼 비우도록 알려준다.
  // 이 컴포넌트가 사라지면 원래 값으로 되돌린다.
  useEffect(() => {
    if (footerHeight === null) return;
    const root = document.documentElement;
    const previous = root.style.scrollPaddingBottom;
    root.style.scrollPaddingBottom = `${footerHeight}px`;
    return () => {
      root.style.scrollPaddingBottom = previous;
    };
  }, [footerHeight]);

  // 포커스 추적. 풋터 안이면 표시를 고정하고, 바깥 텍스트 입력이면 숨긴다.
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      const insideFooter = Boolean(
        target && footerRef.current?.contains(target)
      );
      setFooterFocused(insideFooter);
      setTextInputFocused(!insideFooter && isTextInputElement(target));
    };

    const handleFocusOut = (event: FocusEvent) => {
      // 다음 대상이 있으면 focusin 이 곧 이어진다. 거기서 판단한다.
      if (event.relatedTarget) return;
      setFooterFocused(false);
      setTextInputFocused(false);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  // 잠금이 걸리거나 풀리면 현재 위치에서 기준점을 다시 잡고 재평가한다.
  useEffect(() => {
    lockedRef.current = showLocked || hideLocked;
    resetBaseline();
    evaluate();
  }, [showLocked, hideLocked, evaluate, resetBaseline]);

  // 페이지를 옮기면 표시 상태로 시작한다.
  useEffect(() => {
    applyScrollVisible(true);
    resetBaseline();
  }, [pathname, applyScrollVisible, resetBaseline]);

  async function handleReportClick() {
    try {
      // 비보안 컨텍스트에서는 navigator.clipboard 자체가 없어 여기서 던진다.
      await navigator.clipboard.writeText(REPORT_EMAIL);
      setCopyState("success");
    } catch {
      setCopyState("failure");
    }
  }

  function closeModal() {
    setCopyState(null);
    reportButtonRef.current?.focus();
  }

  return (
    <>
      {/* 1. 본문 흐름 안의 여백. 장식용이라 보조기기에서 감춘다. */}
      <div
        aria-hidden="true"
        className={`w-full shrink-0 ${FALLBACK_SPACER_CLASS}`}
        style={footerHeight === null ? undefined : { height: footerHeight }}
      />

      {/* 2. 화면 하단 고정 메뉴. transform 은 여기에만 건다.
             키보드로 들어오면(footerFocused) 전환 없이 곧바로 보인다. */}
      <footer
        ref={footerRef}
        className={[
          "fixed inset-x-0 bottom-0 z-40 bg-white/90 backdrop-blur-sm",
          footerFocused ? "[transition:none]" : FOOTER_TRANSITION_CLASS,
        ].join(" ")}
        style={{ transform: visible ? "translateY(0)" : "translateY(100%)" }}
      >
        {/* 폭은 본문과 같은 max-w-4xl 로 맞춘다. 구분선이 본문 칼럼과 나란해야
            하므로 화면 끝까지 늘리지 않는다.

            아래 여백은 디자인 여백과 모바일 안전영역 중 **큰 쪽**만 쓴다(max).
            둘을 더하면 안전영역이 있는 기기에서 여백이 이중으로 쌓인다.
            안전영역이 0인 환경에서는 0.625rem 이 그대로 적용된다. 기기 감지나
            미디어쿼리는 두지 않는다 — env() 가 이미 그 역할을 한다. */}
        <div className="mx-auto w-full max-w-4xl px-6 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          {/* 640px 이상은 항목 간격 2.25rem, 미만은 1rem + 라벨 축약(한 줄 유지). */}
          <nav
            aria-label="사이트 안내"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:gap-9 whitespace-nowrap border-t border-navy-100 pt-2.5 text-[0.92rem]"
          >
            <Link
              href="/"
              aria-current={pathname === "/" ? "page" : undefined}
              className={itemClass(pathname === "/")}
            >
              리포트 읽기
            </Link>

            {analyzePublic && (
              <Link
                href="/analyze"
                aria-label="리포트 만들기"
                aria-current={pathname === "/analyze" ? "page" : undefined}
                className={itemClass(pathname === "/analyze")}
              >
                <span className="sm:hidden">만들기</span>
                <span className="hidden sm:inline">리포트 만들기</span>
              </Link>
            )}

            <button
              ref={reportButtonRef}
              type="button"
              onClick={handleReportClick}
              aria-label="리포트 보내기"
              className={itemClass(false)}
            >
              <span className="sm:hidden">보내기</span>
              <span className="hidden sm:inline">리포트 보내기</span>
            </button>

            <Link
              href="/declaration"
              aria-label="지금 우리는"
              aria-current={pathname === "/declaration" ? "page" : undefined}
              className={itemClass(pathname === "/declaration")}
            >
              <span className="sm:hidden">우리는</span>
              <span className="hidden sm:inline">지금 우리는</span>
            </Link>
          </nav>
        </div>
      </footer>

      {/* 3. 모달. 움직이는 풋터 바깥의 형제여야 화면 전체 기준으로 가운데 선다. */}
      {copyState && <MailModal state={copyState} onClose={closeModal} />}
    </>
  );
}

interface MailModalProps {
  state: CopyState;
  onClose: () => void;
}

/**
 * 메일 주소 안내 모달.
 *
 * 성공·실패 어느 쪽이든 주소를 텍스트로 보여준다(user-select: all). 열리면
 * '확인'으로 포커스가 가고, Tab 은 모달 안에 갇히며, Esc·바깥 클릭·확인으로 닫힌다.
 *
 * 등장 효과는 tailwindcss-animate 유틸리티로만 낸다. 이 모달 하나 때문에
 * framer-motion 을 홈 초기 번들에 정적으로 끌어오지 않기 위해서다
 * (ResultViewer 가 dynamic import 로 같은 문제를 피하는 것과 같은 이유).
 */
function MailModal({ state, onClose }: MailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const { title, guide, note } = MODAL_COPY[state];

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      // 오버레이에서 시작한 누름만 바깥 클릭으로 본다(모달 안에서 시작한 드래그 제외).
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-footer-mail-title"
        aria-describedby="site-footer-mail-guide"
        className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none"
      >
        <h2
          id="site-footer-mail-title"
          className="text-lg font-bold text-navy-900"
        >
          {title}
        </h2>

        {/* 실패 문구의 "위 메일 주소"가 가리키는 대상이므로 안내문 위에 둔다. */}
        <p className="mt-4 select-all break-all rounded-lg bg-navy-50 px-4 py-3 text-base text-navy-900">
          {REPORT_EMAIL}
        </p>

        <p
          id="site-footer-mail-guide"
          className="mt-4 break-keep text-sm leading-relaxed text-navy-600"
        >
          {guide.map((sentence) => (
            <span key={sentence} className="block">
              {sentence}
            </span>
          ))}
          {note && <span className="mt-1 block text-xs">{note}</span>}
        </p>

        <button
          ref={confirmRef}
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-navy-200 bg-white px-6 py-2.5 font-medium text-navy-700 outline-none transition-colors hover:border-navy-500 hover:text-navy-900 focus-visible:ring-2 focus-visible:ring-navy-300 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          확인
        </button>
      </div>
    </div>
  );
}

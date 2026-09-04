"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** 완성한 리포트를 받는 주소. 모달 안에도 텍스트로 그대로 보여준다(육안 폴백). */
const REPORT_EMAIL = "report@cr-report.kr";

type CopyState = "success" | "failure";

const MODAL_COPY: Record<CopyState, { title: string; guide: string }> = {
  success: {
    title: "메일 주소가 복사되었어요",
    guide:
      "쓰시는 메일을 열어 받는 사람 칸에 붙여넣고, 완성한 리포트를 보내주세요.",
  },
  failure: {
    title: "자동 복사가 안 됐어요",
    guide: "위 메일 주소를 길게 눌러 직접 복사해 주세요.",
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

interface SiteFooterProps {
  /**
   * 서버에서 읽은 ANALYZE_PUBLIC 값. false 면 '기사 분석하기' 링크를 렌더링하지
   * 않는다. 이 컴포넌트가 받는 prop 은 이것 하나뿐이다.
   */
  analyzePublic: boolean;
}

/**
 * 사이트 공통 풋터. 항목 3개를 가운데 정렬로 배치한다. © 표기는 없다.
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
    // 폭은 홈 본문과 같은 max-w-4xl 로 맞춘다. 구분선이 본문 칼럼과 나란해야
    // 하므로 화면 끝까지 늘리지 않는다.
    <footer className="mx-auto mt-12 w-full max-w-4xl px-6 pb-10">
      {/* 구분선·간격·글자 크기는 목업 analyze-mockup-final.html 104행 footer 규칙. */}
      <nav
        aria-label="사이트 안내"
        className="flex flex-wrap items-center justify-center gap-9 border-t border-navy-100 pt-[1.6rem] text-[0.92rem]"
      >
        {analyzePublic && (
          <Link
            href="/analyze"
            aria-current={pathname === "/analyze" ? "page" : undefined}
            className={itemClass(pathname === "/analyze")}
          >
            기사 분석하기
          </Link>
        )}

        <button
          ref={reportButtonRef}
          type="button"
          onClick={handleReportClick}
          className={itemClass(false)}
        >
          리포트 보내기
        </button>

        <Link
          href="/declaration"
          aria-current={pathname === "/declaration" ? "page" : undefined}
          className={itemClass(pathname === "/declaration")}
        >
          지금 우리는
        </Link>
      </nav>

      {copyState && <MailModal state={copyState} onClose={closeModal} />}
    </footer>
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
  const { title, guide } = MODAL_COPY[state];

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
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none"
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
          className="mt-4 text-sm leading-relaxed text-navy-600"
        >
          {guide}
        </p>

        <button
          ref={confirmRef}
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-navy-900 px-6 py-3 font-medium text-white outline-none transition-colors hover:bg-navy-800 focus-visible:ring-2 focus-visible:ring-navy-300 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          확인
        </button>
      </div>
    </div>
  );
}

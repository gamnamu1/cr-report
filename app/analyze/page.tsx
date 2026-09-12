import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { ANALYZE_PUBLIC } from "@/lib/flags";

import { AnalyzeFlow } from "./AnalyzeFlow";

/**
 * 정적 metadata 다. ANALYZE_PUBLIC 의 robots 분기는 빌드 시점에 평가되므로,
 * 값을 바꾸면 재배포해야 반영된다(lib/flags.ts 참고).
 * canonical 은 홈과 같은 상대 경로 방식이며 layout.tsx 의 metadataBase 로 해석된다.
 */
export const metadata: Metadata = {
  title: "리포트 만들기 — Critical Readers",
  alternates: { canonical: "/analyze" },
  ...(ANALYZE_PUBLIC ? {} : { robots: { index: false, follow: false } }),
};

/**
 * 「리포트 만들기」 페이지.
 *
 * ANALYZE_PUBLIC 은 풋터의 '리포트 만들기' 링크 노출만 제어한다.
 * 이 페이지 자체는 플래그와 무관하게 직접 URL 로 접근할 수 있다.
 * 상태·이벤트가 필요한 ①②카드는 AnalyzeFlow(클라이언트)로 분리했다.
 */
export default function AnalyzePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-navy-50 via-white to-amber-50">
      <main className="flex-1">
        {/* 목업 .wrap — 52rem, padding 2.5rem 1.25rem 4rem, 본문 18px/1.65 */}
        <div className="mx-auto max-w-[52rem] px-5 pb-16 pt-10 text-[18px] leading-[1.65] text-navy-900">
          {/* 목업 .back — navy-500 은 AA 미달이라 navy-600 으로 보정(§0-1) */}
          <Link
            href="/"
            className="mb-6 inline-block text-[0.92rem] text-navy-600 no-underline outline-none hover:text-navy-800 focus-visible:rounded-md focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            ← 리포트 목록으로
          </Link>

          <header>
            <h1 className="text-[1.5rem] font-extrabold tracking-[-0.01em] text-navy-800/[0.66] sm:text-[1.85rem]">
              리포트 만들기
            </h1>
            <p className="mt-[0.6rem] text-base text-navy-600">
              기사 주소를 넣고, 분석 요청문을 복사해 AI에 붙여넣으면 비평 리포트
              초안이 나와요.
            </p>
          </header>

          <AnalyzeFlow />
        </div>
      </main>

      <SiteFooter analyzePublic={ANALYZE_PUBLIC} />
    </div>
  );
}

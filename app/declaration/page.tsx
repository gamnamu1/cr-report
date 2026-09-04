import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";

import { SiteFooter } from "@/components/SiteFooter";
import { ANALYZE_PUBLIC } from "@/lib/flags";

import { DeclarationAudio } from "./DeclarationAudio";

/**
 * 마루부리는 이 페이지에서만 쓴다. tailwind.config.ts 의 fontFamily 와
 * app/layout.tsx 는 건드리지 않고, 아래 className 을 본문 wrapper 에만 붙인다.
 * 뒤로가기 링크·풋터는 wrapper 밖이라 사이트 기존 sans 를 그대로 유지한다.
 * 네이버 CDN 이 아니라 public/fonts 의 woff2 를 자체 호스팅한다.
 */
const maruBuri = localFont({
  src: [
    {
      path: "../../public/fonts/MaruBuri-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/MaruBuri-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  display: "swap",
  fallback: ["Noto Serif KR", "serif"],
});

// 저장소 관행을 따른다. ANALYZE_PUBLIC 이 빌드 시점에 굳지 않고
// 서버 런타임에 읽히도록 하는 효과도 함께 있다.
export const dynamic = "force-dynamic";

// 이 페이지는 ANALYZE_PUBLIC 과 무관하게 항상 색인 대상이라 robots 를 두지 않는다.
export const metadata: Metadata = {
  title: "지금 우리는 — Critical Readers",
  alternates: { canonical: "/declaration" },
};

/** 정본 .em — 강조색 + 굵기 600. 크기는 키우지 않는다. */
const em = "font-semibold text-[#446297]";

export default function DeclarationPage() {
  return (
    // 세션 1-A 홈과 같은 골격. 내용이 짧아도 풋터가 화면 하단에 자리한다.
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-navy-50 via-white to-amber-50">
      <main className="flex-1">
        {/* 정본 .wrap — 행장 38rem, 상단 4rem, 하단 5rem, 좌우 1.5rem(≤640px 1.25rem) */}
        <div className="mx-auto max-w-[38rem] px-5 pb-20 pt-16 sm:px-6">
          {/* 정본 .back — 아래 여백 2.6rem */}
          <Link
            href="/"
            className="mb-[2.6rem] inline-block text-[0.92rem] text-navy-600 no-underline outline-none hover:text-navy-800 focus-visible:rounded-md focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            ← 리포트 목록으로
          </Link>

          {/* 화면에 보이는 제목은 없다. 문서 구조·스크린리더용으로만 남긴다. */}
          <h1 className="sr-only">지금 우리는</h1>

          {/* 정본 .body-text — 마루부리는 여기서부터만 적용된다. */}
          <div
            className={[
              maruBuri.className,
              // 정본 body 의 color: var(--navy-800). globals.css 의 전역
              // --foreground 는 거의 검정이라 여기서 명시해야 정본과 같아진다.
              "text-navy-800",
              "font-normal leading-[2.10] tracking-[-0.020em]",
              // ≤640px 에서 1px 줄인다(정본 미디어쿼리).
              "text-[16.5px] sm:text-[17.5px]",
              "break-keep break-words",
              "[&>p]:mb-[1.5em] [&>p:last-child]:mb-0",
            ].join(" ")}
          >
            <p className="text-[#446297] opacity-[0.92]">
              지식·정보, 인류의 유산, AI, 독점, 질서, 재구축, 빈곤한 상상력,
              고정관념, 교육과 미디어… 언론…{" "}
              <DeclarationAudio />
            </p>

            <p>
              지금 우리는 전환의 시대에 살고 있습니다. AI가 일상이 되고,
              기후위기는 현실이며, 국제정세마저 크게 흔들리는 시대…
              <br />
              &quot;미래를 예측하는 가장 좋은 방법은 그것을 발명하는
              것&quot;이라는 앨런 케이의 말처럼 지금이야말로 적극적으로 미래를
              &#39;상상&#39;해야 할 때입니다.
            </p>

            <p>
              하지만 우리는 자유롭지 못합니다. 성장우선주의, 능력주의와 같은
              사회통념이 우리의 상상력을 제한하기 때문입니다. 이러한 지배적
              이데올로기는 교육을 통해 학습되고,{" "}
              <span className={em}>미디어를 통해 내면화</span>됩니다.
              <br />
              교육을 바꿔 시민의 의식을 자유롭게 하는 것은 한 세대 이상의 긴
              시간이 필요합니다. 언론을 바꾸는 것 역시 어려운 일입니다.
            </p>

            <p>
              우선 언론 개혁이 &#39;무엇&#39;이고, &#39;어떻게&#39; 해야
              하는지 합의하는 것조차 쉽지 않습니다. 누군가는 징벌적손해배상제를,
              또 누군가는 언론사 지배구조를 말합니다.
              <br />
              하지만 관점을 바꿔, 언론이 생산하는{" "}
              <span className={em}>뉴스의 품질</span> 자체에 집중해 보면
              어떨까요. 사회의 공기
              <span className="text-[0.78em] opacity-[0.72]">(公器)</span>를
              자임하는 언론이 과연 제 역할을 하고 있는지, 혹은 불량 상품을
              유통하며 사회에 해악을 끼치고 있는 것은 아닌지, 그 품질을 직접 묻고
              확인하는 겁니다.
            </p>

            <p>
              언론사회에는 언론윤리헌장, 인권보도준칙 등 저널리즘 가치와 원칙을
              담은 다양한 규범이 존재합니다. 문제는,{" "}
              <span className={em}>아무도 그 규범이 지켜지는지 묻지 않는</span>
              다는 데 있습니다. 하루 수천 개의 기사를 소수의 전문 비평가가 모두
              감당할 수 없고, 신문윤리위나 언론중재위 같은 공식 기구는 극히
              일부의 문제만을 다룰 뿐입니다.
            </p>

            <p>
              그래서 우리는,{" "}
              <span className={em}>시민들이 직접 뉴스의 품질을 묻는</span> 방식을
              제안합니다.
              <br />
              시민과 비평, 플랫폼을 결합해 문제적 보도 관행을 찾아내고,
              &#39;언론윤리규범&#39;을 근거로 품질을 묻는 것입니다. 시민들이
              AI 기술을 활용해 손쉽게 뉴스를 분석하고, 그 속에 숨은 문제적
              보도관행과 위반된 윤리 규범을 확인하며, 그 결과를 공유하고
              확산시키는 시민 참여 프로젝트.
            </p>

            <p>
              이 제안은 단순한 기술 프로젝트가 아닌, 시민 언론 운동에 가깝습니다.
              시민이 AI를 도구로 활용해 언론을 바꾸고, 이를 통해 관습적 사고의
              틀에 갇혀있던 우리 의식을 해방시키는 실험.
              <br />
              언론이 바뀌면 사회통념이 바뀌고, 통념이 바뀌면 우리는 더 자유롭게
              상상할 수 있을 것입니다.
            </p>

            <p className="text-[#446297] opacity-[0.95]">
              기술은 단순한 도구가 아니라 사회를 재구성하는 힘이어야 합니다.
              <br />
              <span className={em}>
                시민들이 그 힘으로 더 나은 사회를 상상하고, 또 발명
              </span>
              할 수 있기를 희망합니다.
            </p>
          </div>
        </div>
      </main>

      {/* 홈과 달리 플래그와 무관하게 항상 렌더링한다. false 면 풋터 안에서
          '기사 분석하기' 링크만 빠진다. */}
      <SiteFooter analyzePublic={ANALYZE_PUBLIC} />
    </div>
  );
}

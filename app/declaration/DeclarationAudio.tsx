"use client";

import { useRef, useState } from "react";

/** 정본 declaration-final.html 의 ICON_PLAY / ICON_PAUSE 를 그대로 옮긴 것. */
const ICON_PLAY =
  "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z";
const ICON_PAUSE = "M6 5h4v14H6zm8 0h4v14h-4z";

/**
 * 선언문 낭독 토글. 이 페이지에서 브라우저 상호작용이 필요한 유일한 부분이라
 * 여기만 client boundary 로 떼어내고, app/declaration/page.tsx 는 서버
 * 컴포넌트로 남긴다.
 *
 * 정본과 마찬가지로 버튼·상태문·audio 를 lede 문단 안에 함께 둔다.
 * preload 는 "metadata" 를 유지한다 — 진입만으로 3.4MB 를 받지 않게 한다.
 */
export function DeclarationAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("");

  async function handleToggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      setMessage("");
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setMessage("낭독을 재생할 수 없어요. 잠시 후 다시 눌러 주세요.");
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  return (
    <>
      {/* 정본 .audio-btn — 지름 1.68rem, 아이콘 0.84rem, 재생 중 navy-800 반전 */}
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={playing}
        aria-label={playing ? "낭독 멈추기" : "선언문 낭독 듣기"}
        className={[
          "inline-flex h-[1.68rem] w-[1.68rem] items-center justify-center",
          "ml-[0.3rem] align-[-0.32rem]",
          "rounded-full border border-navy-200 bg-white text-navy-600",
          // duration-* 는 tailwindcss-animate 와 겹쳐 임의값이 버려지므로
          // ExpandingSearch 와 같이 transition 단축 속성을 통째로 지정한다.
          "[transition:border-color_150ms,color_150ms] motion-reduce:[transition:none]",
          "hover:border-navy-500 hover:text-navy-800",
          "aria-pressed:border-navy-800 aria-pressed:bg-navy-800 aria-pressed:text-white",
          "outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-500",
        ].join(" ")}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-[0.84rem] w-[0.84rem] fill-current"
        >
          <path d={playing ? ICON_PAUSE : ICON_PLAY} />
        </svg>
      </button>

      {/* 정본 .audio-state — 항상 마운트해 두고 텍스트만 갱신한다
          (조건부 렌더로 붙였다 떼면 스크린리더가 읽지 않는다). */}
      <span
        role="status"
        aria-live="polite"
        className="mt-[0.9rem] block font-sans text-[0.85rem] text-navy-600"
      >
        {message}
      </span>

      <audio
        ref={audioRef}
        preload="metadata"
        src="/audio/cr_ch0_declaration.mp3"
        onEnded={() => {
          setPlaying(false);
          setMessage("");
        }}
        onError={() => setMessage("낭독 파일을 불러오지 못했어요.")}
      />
    </>
  );
}

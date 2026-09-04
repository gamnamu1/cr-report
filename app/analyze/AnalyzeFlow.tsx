"use client";

import { useEffect, useRef, useState } from "react";

import { assembleKit } from "@/lib/assembleKit";

/** 상류 PR1 계약의 세 값. 좁힐 때 셋을 모두 포함한다. */
type SourceKind = "portal" | "outlet" | "generic";

/**
 * 시민이 확인한 현재 기사. 화면 표시와 (세션 3-B의) 조립이 쓰는 유일한 값.
 * 서버 원본은 따로 보관하고, 편집은 이 값만 바꾼다.
 */
interface ConfirmedArticle {
  title: string;
  content: string;
  publisher: string | null;
  journalist: string | null;
  publishDate: string | null;
  /** 본문 글자 수. 추출본은 상류 content_chars, 편집·수동 입력본은 본문 길이. */
  chars: number;
  /** 자동 추출 응답에서 받은 값만 보존한다. 수동 입력본은 null. */
  sourceKind: SourceKind | null;
  origin: "extracted" | "manual";
  /** §3-4 3분기 결과. null 이면 조립 시 "(직접 입력)". */
  sourceUrl: string | null;
}

const FETCH_FAILED =
  "기사를 불러오지 못했어요. 주소를 다시 확인하시거나, 아래에서 직접 넣어 주세요.";
const UNAVAILABLE =
  "지금은 기사를 불러올 수 없어요. 잠시 후 다시 시도하시거나, 아래에서 직접 넣어 주세요.";

/** 지시서 §5 정본. 표에 없는 code·비JSON·파싱 실패는 FETCH_FAILED 를 재사용한다. */
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_URL: "기사 주소 형식이 올바르지 않아요. 주소를 다시 확인해 주세요.",
  UNSAFE_URL:
    "이 주소는 불러올 수 없어요. 언론사나 포털의 기사 주소를 넣어 주세요.",
  ARTICLE_NOT_FOUND:
    "이 주소에서 기사 내용을 찾지 못했어요. 아래에서 직접 넣어 주세요.",
  UNSUPPORTED_CONTENT_TYPE: FETCH_FAILED,
  SOURCE_FETCH_FAILED: FETCH_FAILED,
  RESPONSE_TOO_LARGE: FETCH_FAILED,
  SOURCE_TIMEOUT:
    "언론사 페이지의 응답이 너무 늦어요. 잠시 후 다시 시도하시거나, 아래에서 직접 넣어 주세요.",
  RATE_LIMITED: "요청이 잠시 몰렸어요. 1분쯤 뒤에 다시 눌러 주세요.",
  UNAUTHORIZED_CALLER: UNAVAILABLE,
  EXTRACTOR_ERROR: UNAVAILABLE,
  EXTRACTOR_DISABLED: UNAVAILABLE,
};

function messageForCode(code: unknown): string {
  if (typeof code === "string" && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return FETCH_FAILED;
}

const HINT_COMPLETE =
  "아래 내용이 실제 기사 내용과 맞는지 확인해 주세요. 잘못된 부분이 있으면 '잘못된 부분 고치기' 버튼을 눌러 수정해 주세요.";
const HINT_INCOMPLETE =
  "기사 본문은 가져왔지만 일부 정보는 확인하지 못했어요. '미확인'으로 두거나, 아는 경우에만 '잘못된 부분 고치기' 버튼을 눌러 채워 주세요.";

const LOADING_MSG = "기사를 불러오고 있어요…";
const LOADING_SLOW_MSG =
  "언론사 페이지의 응답이 늦어지고 있어요. 잠시만 더 기다려 주세요.";

// ── 목업 CSS 를 그대로 옮긴 공통 클래스 ──────────────────────────────
const CARD =
  "mt-[2.7rem] rounded-xl border border-navy-100 bg-white px-[1.55rem] py-[1.6rem] shadow-[0_1px_2px_rgba(16,42,67,0.04)]";
const CARD_H2 = "text-[1.12rem] font-bold text-navy-800/[0.75]";
// 목업 .hint 는 navy-500(4.28:1) 이라 AA 미달 → navy-600 으로 보정(§0-1)
const HINT = "mt-[0.4rem] text-[0.9rem] text-navy-600";
const FIELD =
  "mt-[0.8rem] w-full rounded-[10px] border-[1.5px] border-navy-200 bg-white px-4 py-[0.85rem] text-base text-navy-900 outline-none placeholder:text-[0.95rem] placeholder:text-navy-600 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-500";
const INPUT = `${FIELD} min-h-[3.4rem]`;
const TEXTAREA = `${FIELD} min-h-[10rem] resize-y leading-[1.6]`;
const BTN =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border-none px-[1.4rem] text-base font-extrabold outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-500";
const BTN_PRIMARY = `${BTN} mt-[0.9rem] min-h-[3.2rem] w-full bg-navy-800 text-white hover:bg-navy-900 disabled:cursor-not-allowed disabled:bg-navy-200`;
const BTN_GHOST = `${BTN} min-h-[2.8rem] w-full border-[1.5px] border-navy-200 bg-white text-[0.93rem] font-bold text-navy-700 hover:border-navy-500 sm:w-auto`;
const BTN_ROW = "mt-[0.9rem] flex flex-wrap gap-[0.6rem]";
const STATUS =
  "mt-4 rounded-[10px] border border-navy-100 bg-navy-50 px-[1.05rem] py-[0.9rem] text-[0.95rem] text-navy-700";
const STATUS_STRONG =
  "mt-4 rounded-[10px] border border-navy-100 bg-navy-50 px-[1.05rem] py-[0.9rem] text-[0.95rem] font-semibold text-navy-900";
const EDIT_LABEL =
  "mt-[0.8rem] block text-[0.92rem] font-bold text-navy-700";
const TRIPLE_GRID = "mt-[0.3rem] grid grid-cols-1 gap-[0.6rem] sm:grid-cols-3";
// 좁은 화면에서는 보이는 label, 넓은 화면에서는 목업대로 placeholder 만 보인다.
const TRIPLE_LABEL =
  "mt-[0.6rem] block text-[0.92rem] font-bold text-navy-700 sm:sr-only";
const TRIPLE_INPUT = `${INPUT} mt-[0.3rem] sm:mt-0`;
const INLINE_ERROR = "mt-[0.35rem] text-[0.88rem] font-semibold text-red-700";

// ── ② 하단 복사 흐름 ────────────────────────────────────────────────
const COPY_NOTE =
  "아래 버튼을 누르면 기사 본문과 분석 기준(언론윤리규범, 문제적 보도관행, 잘 쓴 리포트 예시)이 담긴 분석 요청문이 복사돼요. 꽤 길지만 정상이에요.";
const KIT_LOADING_MSG = "분석 요청문을 준비하고 있어요…";
const KIT_READY_MSG = "분석 요청문이 준비됐어요.";
const KIT_ERROR_MSG = "분석 자료를 불러오지 못했어요. '다시 시도'를 눌러 주세요.";
const COPIED_MSG = "복사했어요. 이제 아래 순서대로 AI에서 분석해 보세요.";
const COPY_FAIL_MSG = "자동 복사가 안 됐어요. 위의 '파일로 저장하기'를 눌러 주세요.";

const COPY_NOTE_CLASS = "mt-[1.15rem] text-[0.93rem] text-navy-600";
// 목업 .link-sub 는 navy-500(4.28:1) 이라 AA 미달 → navy-600 으로 보정(§0-1)
const LINK_SUB =
  "mt-[0.75rem] inline-block border-none bg-transparent text-left text-[0.9rem] text-navy-600 underline underline-offset-[3px] outline-none hover:text-navy-800 disabled:cursor-not-allowed disabled:text-navy-400 disabled:no-underline focus-visible:rounded-md focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-500";
const COPIED_BOX =
  "mt-4 rounded-[10px] border-[1.5px] border-navy-300 bg-navy-50 px-[1.1rem] py-[0.95rem]";

// ── ③④ 카드 ────────────────────────────────────────────────────────
const GUIDE_ITEM =
  "flex gap-[0.8rem] rounded-[10px] border border-navy-100 bg-navy-50 px-[1.05rem] py-[0.95rem]";
const GUIDE_NUM =
  "mt-[0.15rem] flex h-[1.45rem] w-[1.45rem] flex-none items-center justify-center rounded-full bg-navy-100 text-[0.8rem] font-bold text-navy-600";
// 목업 .small-note 는 navy-400(2.91:1) 이라 AA 미달 → navy-600 으로 보정(§0-1)
const SMALL_NOTE = "mt-[0.9rem] text-[0.85rem] text-navy-600";
const CHECK_ITEM =
  "flex cursor-pointer items-start gap-[0.7rem] rounded-[10px] border border-navy-100 bg-navy-50 px-4 py-[0.8rem] text-[0.95rem] font-medium";
const CHECK_SUB = "mt-[0.25rem] block text-[0.85rem] font-normal text-navy-600";

/** OS 가 파일명에 허용하지 않는 문자. */
const FORBIDDEN_IN_FILENAME = /[\\/:*?"<>|]/g;

/** 브라우저의 로컬 달력 날짜. UTC 기준(toISOString)을 쓰면 새벽에 하루 밀린다. */
function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function downloadFileName(title: string): string {
  const safe = Array.from(title.replace(FORBIDDEN_IN_FILENAME, ""))
    .slice(0, 24)
    .join("");
  return `CR분석_${safe}_${todayStamp()}.txt`;
}

interface Kit {
  version: string;
  preamble: string;
  postamble: string;
}

type KitState = "idle" | "loading" | "ready" | "error";

interface DraftFields {
  title: string;
  publisher: string;
  journalist: string;
  publishDate: string;
  content: string;
}

const EMPTY_DRAFT: DraftFields = {
  title: "",
  publisher: "",
  journalist: "",
  publishDate: "",
  content: "",
};

/** trim 후 빈 문자열이면 null. 매체·기자·게재일은 선택 항목이다. */
function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function UnknownMark() {
  return (
    <span className="border-b-[1.5px] border-dotted border-navy-300 font-bold text-navy-600">
      미확인
    </span>
  );
}

export function AnalyzeFlow() {
  // ① 상태
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSG);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState<DraftFields>(EMPTY_DRAFT);
  const [manualErrors, setManualErrors] = useState<Partial<DraftFields>>({});

  // ② 상태
  const [confirmed, setConfirmed] = useState<ConfirmedArticle | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<DraftFields>(EMPTY_DRAFT);
  const [editErrors, setEditErrors] = useState<Partial<DraftFields>>({});

  // ③④ 상태
  const [kit, setKit] = useState<Kit | null>(null);
  const [kitState, setKitState] = useState<KitState>("idle");
  const [copyState, setCopyState] = useState<"none" | "copied" | "failed">("none");
  const [nextUnlocked, setNextUnlocked] = useState(false);

  /** 서버가 준 원본. 시민 편집으로 덮어쓰지 않는다. */
  const serverArticleRef = useRef<ConfirmedArticle | null>(null);
  /** 시민이 '기사 불러오기'를 눌렀던 원 URL. §3-4 3분기의 근거라 입력칸과 따로 둔다. */
  const submittedUrlRef = useRef<string | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** /api/kit 요청 세대. reset 하면 올려서, 진행 중이던 응답이 새 상태를 덮지 못하게 한다. */
  const kitGenRef = useRef(0);

  const sec1HeadingRef = useRef<HTMLHeadingElement>(null);
  const sec2Ref = useRef<HTMLElement>(null);
  const sec2HeadingRef = useRef<HTMLHeadingElement>(null);
  const sec3Ref = useRef<HTMLElement>(null);
  const sec4Ref = useRef<HTMLElement>(null);
  const manualTitleRef = useRef<HTMLInputElement>(null);

  const locked = confirmed === null;

  // 잠긴 카드는 inert 로 막는다(opacity·pointer-events·aria-hidden 조합을 쓰지 않는다).
  // inert 를 먼저 풀어야 뒤이은 focus() 가 먹는다 — 순서를 바꾸지 말 것.
  // ②카드가 열리는 이 시점에 키트를 프리페치한다. locked 가 false 로 바뀔 때만
  // 실행되므로 추출 성공·수동 입력 두 경로 모두에 걸리고, 편집으로는 다시 돌지 않는다.
  useEffect(() => {
    const el = sec2Ref.current;
    if (el) (el as HTMLElement & { inert: boolean }).inert = locked;
    if (locked) return;
    sec2HeadingRef.current?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    void loadKit();
    // loadKit 은 매 렌더 새로 만들어지지만 locked 전이에서만 호출하면 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  useEffect(() => {
    for (const el of [sec3Ref.current, sec4Ref.current]) {
      if (el) (el as HTMLElement & { inert: boolean }).inert = !nextUnlocked;
    }
  }, [nextUnlocked]);

  useEffect(() => {
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (manualOpen) manualTitleRef.current?.focus();
  }, [manualOpen]);

  async function handleFetch() {
    const trimmed = url.trim();
    // URL 형식을 클라이언트에서 선판정하지 않는다. 스킴 보정은 상류 책임이다.
    if (trimmed === "" || loading) return;

    setErrorMsg(null);
    setManualOpen(false);
    setLoading(true);
    setLoadingMsg(LOADING_MSG);
    submittedUrlRef.current = trimmed;

    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => setLoadingMsg(LOADING_SLOW_MSG), 4000);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      // 비JSON·파싱 실패는 null 로 떨어뜨려 fallback 문구를 쓰게 한다.
      const data: unknown = await res.json().catch(() => null);
      const payload = (data ?? {}) as {
        ok?: unknown;
        code?: unknown;
        article?: {
          title?: unknown;
          content?: unknown;
          url?: unknown;
          publisher?: unknown;
          journalist?: unknown;
          publish_date?: unknown;
          source_kind?: unknown;
        };
        content_chars?: unknown;
      };

      const article = payload.article;
      const ok =
        res.ok &&
        payload.ok === true &&
        typeof article?.title === "string" &&
        typeof article?.content === "string";

      if (!ok) {
        setErrorMsg(messageForCode(payload.code));
        return;
      }

      const content = article.content as string;
      const next: ConfirmedArticle = {
        title: article.title as string,
        content,
        publisher: typeof article.publisher === "string" ? article.publisher : null,
        journalist:
          typeof article.journalist === "string" ? article.journalist : null,
        publishDate:
          typeof article.publish_date === "string" ? article.publish_date : null,
        chars:
          typeof payload.content_chars === "number"
            ? payload.content_chars
            : content.length,
        sourceKind:
          article.source_kind === "portal" ||
          article.source_kind === "outlet" ||
          article.source_kind === "generic"
            ? article.source_kind
            : null,
        origin: "extracted",
        sourceUrl: typeof article.url === "string" ? article.url : trimmed,
      };
      serverArticleRef.current = next;
      setConfirmed(next);
    } catch {
      // 네트워크 자체가 실패한 경우도 표에 없는 상황이라 fallback 을 쓴다.
      setErrorMsg(FETCH_FAILED);
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setLoading(false);
    }
  }

  function handleManualSubmit() {
    const title = manualDraft.title.trim();
    const content = manualDraft.content.trim();
    const errors: Partial<DraftFields> = {};
    if (title === "") errors.title = "기사 제목을 넣어 주세요.";
    if (content === "") errors.content = "기사 본문을 넣어 주세요.";
    setManualErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const next: ConfirmedArticle = {
      title,
      content,
      publisher: orNull(manualDraft.publisher),
      journalist: orNull(manualDraft.journalist),
      publishDate: orNull(manualDraft.publishDate),
      chars: content.length,
      // 수동 입력본에는 상류의 판정값을 지어내지 않는다.
      sourceKind: null,
      origin: "manual",
      // 추출을 시도했다면 그때 넣었던 주소를 보존한다.
      sourceUrl: submittedUrlRef.current,
    };
    setErrorMsg(null);
    setManualOpen(false);
    setConfirmed(next);
  }

  function openEdit() {
    if (!confirmed) return;
    setEditDraft({
      title: confirmed.title,
      publisher: confirmed.publisher ?? "",
      journalist: confirmed.journalist ?? "",
      publishDate: confirmed.publishDate ?? "",
      content: confirmed.content,
    });
    setEditErrors({});
    setEditing(true);
  }

  function saveEdit() {
    if (!confirmed) return;
    const title = editDraft.title.trim();
    const content = editDraft.content.trim();
    const errors: Partial<DraftFields> = {};
    if (title === "") errors.title = "기사 제목은 비워 둘 수 없어요.";
    if (content === "") errors.content = "기사 본문은 비워 둘 수 없어요.";
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setConfirmed({
      ...confirmed,
      title,
      content,
      chars: content.length,
      publisher: orNull(editDraft.publisher),
      journalist: orNull(editDraft.journalist),
      publishDate: orNull(editDraft.publishDate),
    });
    setEditing(false);
  }

  /** 이번 draft 만 버린다. 마지막 확정본은 그대로 둔다(서버 원본으로 되돌리지 않는다). */
  function cancelEdit() {
    setEditing(false);
    setEditErrors({});
  }

  /** 키트 프리페치. 자동 재시도는 하지 않는다 — 실패하면 '다시 시도' 버튼으로만 다시 부른다. */
  async function loadKit() {
    const gen = ++kitGenRef.current;
    setKitState("loading");
    try {
      const res = await fetch("/api/kit", { cache: "no-store" });
      const data: unknown = res.ok ? await res.json().catch(() => null) : null;
      const k = data as Partial<Kit> | null;
      if (gen !== kitGenRef.current) return; // reset 등으로 세대가 바뀌었으면 버린다
      if (
        !k ||
        typeof k.version !== "string" ||
        typeof k.preamble !== "string" ||
        typeof k.postamble !== "string"
      ) {
        setKitState("error");
        return;
      }
      setKit({ version: k.version, preamble: k.preamble, postamble: k.postamble });
      setKitState("ready");
    } catch {
      if (gen !== kitGenRef.current) return;
      setKitState("error");
    }
  }

  /** 복사와 TXT 저장이 쓰는 유일한 조립 경로. 두 경로가 각자 만들지 않는다. */
  function buildRequestText(article: ConfirmedArticle, loaded: Kit): string {
    return assembleKit({
      preamble: loaded.preamble,
      postamble: loaded.postamble,
      version: loaded.version,
      article: {
        title: article.title,
        content: article.content,
        publisher: article.publisher,
        journalist: article.journalist,
        publishDate: article.publishDate,
      },
      sourceUrl: article.sourceUrl,
    });
  }

  /** ③④를 연다. 안내를 가리지 않도록 스크롤은 호출부가 정한다. */
  function unlockNext(scrollToGuide: boolean) {
    setNextUnlocked(true);
    if (!scrollToGuide) return;
    setTimeout(
      () => sec3Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      250
    );
  }

  async function handleCopy() {
    if (!confirmed || !kit) return;
    // Safari 는 사용자 제스처의 활성 창 안에서 writeText 가 불리기를 요구한다.
    // 조립은 동기로 끝내고, writeText 앞에 어떤 await 도 두지 않는다.
    const text = buildRequestText(confirmed, kit);
    try {
      const copyPromise = navigator.clipboard.writeText(text);
      await copyPromise;
      setCopyState("copied");
      unlockNext(true);
    } catch {
      // navigator.clipboard 부재로 동기 throw 되는 경우도 여기서 잡힌다.
      setCopyState("failed");
      unlockNext(true);
    }
  }

  function handleDownload() {
    if (!confirmed || !kit) return;
    // TxtPreviewModal 62~70행과 같은 패턴.
    const text = buildRequestText(confirmed, kit);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadFileName(confirmed.title);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    unlockNext(true);
  }

  /** '처음부터 다시 하기'. 새로고침 대신 상태를 전부 되돌린다. */
  function resetAll() {
    kitGenRef.current += 1; // 진행 중인 /api/kit 응답을 무효화한다
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    setUrl("");
    setLoading(false);
    setLoadingMsg(LOADING_MSG);
    setErrorMsg(null);
    setManualOpen(false);
    setManualDraft(EMPTY_DRAFT);
    setManualErrors({});
    setConfirmed(null);
    setEditing(false);
    setEditDraft(EMPTY_DRAFT);
    setEditErrors({});
    setKit(null);
    setKitState("idle");
    setCopyState("none");
    setNextUnlocked(false);
    serverArticleRef.current = null;
    // 남겨두면 다음 직접 입력의 '주소'로 새어 나가 "(직접 입력)" 분기가 깨진다.
    submittedUrlRef.current = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
    sec1HeadingRef.current?.focus();
  }

  const kitReady = kitState === "ready" && kit !== null;

  const incomplete =
    confirmed !== null &&
    (!confirmed.publisher || !confirmed.journalist || !confirmed.publishDate);

  return (
    <>
      {/* ① 분석할 기사 주소를 넣어주세요 */}
      <section className={CARD} aria-labelledby="sec1-heading">
        <h2
          id="sec1-heading"
          ref={sec1HeadingRef}
          tabIndex={-1}
          className={`${CARD_H2} outline-none`}
        >
          분석할 기사 주소를 넣어주세요
        </h2>

        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleFetch();
            }
          }}
          aria-label="기사 주소"
          placeholder="네이버·다음·네이트 등 포털 뉴스나 언론사 홈페이지의 기사 주소"
          className={INPUT}
        />
        <p className={HINT}>
          스트레이트 뉴스와 해설 기사가 분석 대상이에요. 칼럼·사설·인터뷰는 아직
          다루지 않아요.
        </p>
        <button
          type="button"
          onClick={() => void handleFetch()}
          disabled={url.trim() === "" || loading}
          className={BTN_PRIMARY}
        >
          기사 불러오기
        </button>

        {loading && (
          <div className={STATUS} aria-live="polite">
            <span
              aria-hidden="true"
              className="mr-2 inline-block h-[1em] w-[1em] animate-spin rounded-full border-[2.5px] border-navy-200 border-t-navy-700 align-[-2px] [animation-duration:0.8s] motion-reduce:animate-none"
            />
            <span>{loadingMsg}</span>
          </div>
        )}

        <div aria-live="polite">
          {errorMsg && (
            <div className={STATUS_STRONG}>
              <p>{errorMsg}</p>
              <div className={BTN_ROW}>
                <button
                  type="button"
                  onClick={() => void handleFetch()}
                  className={BTN_GHOST}
                >
                  다시 시도
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualErrors({});
                    setManualOpen(true);
                  }}
                  className={BTN_GHOST}
                >
                  기사 내용 직접 붙여넣기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 수동 입력 폼 — 자동으로 열리지 않는다. 위 버튼으로만 연다. */}
        {manualOpen && (
          <div className="mt-4">
            <label htmlFor="manual-title" className={EDIT_LABEL}>
              기사 제목
            </label>
            <input
              id="manual-title"
              ref={manualTitleRef}
              type="text"
              value={manualDraft.title}
              onChange={(e) =>
                setManualDraft({ ...manualDraft, title: e.target.value })
              }
              aria-invalid={manualErrors.title ? true : undefined}
              aria-describedby={manualErrors.title ? "manual-title-error" : undefined}
              className={`${INPUT} mt-[0.3rem]`}
            />
            {manualErrors.title && (
              <p id="manual-title-error" role="alert" className={INLINE_ERROR}>
                {manualErrors.title}
              </p>
            )}

            <label htmlFor="manual-body" className={EDIT_LABEL}>
              기사 본문
            </label>
            <textarea
              id="manual-body"
              value={manualDraft.content}
              onChange={(e) =>
                setManualDraft({ ...manualDraft, content: e.target.value })
              }
              aria-invalid={manualErrors.content ? true : undefined}
              aria-describedby={manualErrors.content ? "manual-body-error" : undefined}
              placeholder="기사 본문 전체를 한 번에 붙여넣어 주세요"
              className={`${TEXTAREA} mt-[0.3rem]`}
            />
            {manualErrors.content && (
              <p id="manual-body-error" role="alert" className={INLINE_ERROR}>
                {manualErrors.content}
              </p>
            )}

            <p className={EDIT_LABEL}>아는 것만 채워 주세요</p>
            <div className={TRIPLE_GRID}>
              <div>
                <label htmlFor="manual-pub" className={TRIPLE_LABEL}>
                  매체
                </label>
                <input
                  id="manual-pub"
                  type="text"
                  value={manualDraft.publisher}
                  onChange={(e) =>
                    setManualDraft({ ...manualDraft, publisher: e.target.value })
                  }
                  placeholder="매체"
                  className={TRIPLE_INPUT}
                />
              </div>
              <div>
                <label htmlFor="manual-jour" className={TRIPLE_LABEL}>
                  기자
                </label>
                <input
                  id="manual-jour"
                  type="text"
                  value={manualDraft.journalist}
                  onChange={(e) =>
                    setManualDraft({ ...manualDraft, journalist: e.target.value })
                  }
                  placeholder="기자"
                  className={TRIPLE_INPUT}
                />
              </div>
              <div>
                <label htmlFor="manual-date" className={TRIPLE_LABEL}>
                  게재일
                </label>
                <input
                  id="manual-date"
                  type="text"
                  value={manualDraft.publishDate}
                  onChange={(e) =>
                    setManualDraft({ ...manualDraft, publishDate: e.target.value })
                  }
                  placeholder="게재일"
                  className={TRIPLE_INPUT}
                />
              </div>
            </div>

            <button type="button" onClick={handleManualSubmit} className={BTN_PRIMARY}>
              입력한 내용 확인
            </button>
          </div>
        )}
      </section>

      {/* ② 불러온 기사를 확인해 주세요 — 잠겨 있으면 inert 로 포커스가 닿지 않는다 */}
      <section
        ref={sec2Ref}
        aria-labelledby="sec2-heading"
        className={`${CARD} ${locked ? "opacity-40" : ""}`}
      >
        <h2
          id="sec2-heading"
          ref={sec2HeadingRef}
          tabIndex={-1}
          className={`${CARD_H2} outline-none`}
        >
          불러온 기사를 확인해 주세요
        </h2>
        <p className={HINT}>{incomplete ? HINT_INCOMPLETE : HINT_COMPLETE}</p>

        <div className="mt-[1.1rem] rounded-[10px] border-[1.5px] border-navy-100 bg-navy-50 px-[1.2rem] py-[1.15rem]">
          <dl className="grid grid-cols-[auto_1fr] gap-x-[0.9rem] gap-y-[0.3rem] text-[0.95rem]">
            <dt className="font-bold text-navy-600">제목</dt>
            <dd className="leading-[1.5]">{confirmed?.title ?? ""}</dd>
            <dt className="font-bold text-navy-600">매체</dt>
            <dd>{confirmed?.publisher ?? (confirmed ? <UnknownMark /> : "")}</dd>
            <dt className="font-bold text-navy-600">기자</dt>
            <dd>{confirmed?.journalist ?? (confirmed ? <UnknownMark /> : "")}</dd>
            <dt className="font-bold text-navy-600">게재일</dt>
            <dd>{confirmed?.publishDate ?? (confirmed ? <UnknownMark /> : "")}</dd>
            <dt className="font-bold text-navy-600">본문</dt>
            <dd>
              {confirmed
                ? `약 ${confirmed.chars.toLocaleString("ko-KR")}자를 가져왔어요`
                : ""}
            </dd>
          </dl>

          <div className={BTN_ROW}>
            <button type="button" onClick={openEdit} className={BTN_GHOST}>
              잘못된 부분 고치기
            </button>
          </div>

          {/* 편집 폼 — 수동 입력 폼과 필드 순서가 다르다(목업 그대로). */}
          {editing && (
            <div className="mt-4">
              <label htmlFor="edit-title" className={EDIT_LABEL}>
                기사 제목
              </label>
              <input
                id="edit-title"
                type="text"
                value={editDraft.title}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, title: e.target.value })
                }
                aria-invalid={editErrors.title ? true : undefined}
                aria-describedby={editErrors.title ? "edit-title-error" : undefined}
                className={`${INPUT} mt-[0.3rem]`}
              />
              {editErrors.title && (
                <p id="edit-title-error" role="alert" className={INLINE_ERROR}>
                  {editErrors.title}
                </p>
              )}

              <div className={`${TRIPLE_GRID} mt-[0.6rem]`}>
                <div>
                  <label htmlFor="edit-pub" className={TRIPLE_LABEL}>
                    매체
                  </label>
                  <input
                    id="edit-pub"
                    type="text"
                    value={editDraft.publisher}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, publisher: e.target.value })
                    }
                    placeholder="매체"
                    className={TRIPLE_INPUT}
                  />
                </div>
                <div>
                  <label htmlFor="edit-jour" className={TRIPLE_LABEL}>
                    기자
                  </label>
                  <input
                    id="edit-jour"
                    type="text"
                    value={editDraft.journalist}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, journalist: e.target.value })
                    }
                    placeholder="기자"
                    className={TRIPLE_INPUT}
                  />
                </div>
                <div>
                  <label htmlFor="edit-date" className={TRIPLE_LABEL}>
                    게재일
                  </label>
                  <input
                    id="edit-date"
                    type="text"
                    value={editDraft.publishDate}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, publishDate: e.target.value })
                    }
                    placeholder="게재일"
                    className={TRIPLE_INPUT}
                  />
                </div>
              </div>

              <label htmlFor="edit-body" className={EDIT_LABEL}>
                기사 본문
              </label>
              <textarea
                id="edit-body"
                value={editDraft.content}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, content: e.target.value })
                }
                aria-invalid={editErrors.content ? true : undefined}
                aria-describedby={editErrors.content ? "edit-body-error" : undefined}
                className={`${TEXTAREA} mt-[0.3rem]`}
              />
              {editErrors.content && (
                <p id="edit-body-error" role="alert" className={INLINE_ERROR}>
                  {editErrors.content}
                </p>
              )}

              <div className={BTN_ROW}>
                <button
                  type="button"
                  onClick={saveEdit}
                  className={`${BTN} min-h-[3.2rem] w-full bg-navy-800 text-white hover:bg-navy-900 sm:w-auto`}
                >
                  수정 내용 저장
                </button>
                <button type="button" onClick={cancelEdit} className={BTN_GHOST}>
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 복사 흐름 ── */}
        <p className={COPY_NOTE_CLASS}>{COPY_NOTE}</p>

        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={!kitReady}
          className={BTN_PRIMARY}
        >
          분석 요청문 복사하기
        </button>

        {/* <a> 로 만들면 disabled 가 먹지 않으므로 button 을 링크처럼 꾸민다. */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={!kitReady}
          className={LINK_SUB}
        >
          파일로 저장하기 (.txt) — 복사가 안 될 경우 파일로 저장/첨부해 주세요
        </button>

        {/* 준비 상태. disabled 버튼은 포커스가 닿지 않아 스크린리더가 변화를 놓치므로
            여기서 aria-live 로 알린다. 항상 마운트해 두고 내용만 바꾼다. */}
        <div aria-live="polite">
          {kitState === "loading" && (
            <p className={`${STATUS} flex items-center gap-2`}>
              <span
                aria-hidden="true"
                className="inline-block h-[1em] w-[1em] animate-spin rounded-full border-[2.5px] border-navy-200 border-t-navy-700 [animation-duration:0.8s] motion-reduce:animate-none"
              />
              <span>{KIT_LOADING_MSG}</span>
            </p>
          )}
          {kitReady && <p className="sr-only">{KIT_READY_MSG}</p>}
          {kitState === "error" && (
            <div className={STATUS_STRONG}>
              <p>{KIT_ERROR_MSG}</p>
              <div className={BTN_ROW}>
                <button
                  type="button"
                  onClick={() => void loadKit()}
                  className={BTN_GHOST}
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}
        </div>

        <div aria-live="polite">
          {copyState === "copied" && (
            <div className={COPIED_BOX}>
              <p className="font-extrabold text-navy-800">{COPIED_MSG}</p>
              <div className={BTN_ROW}>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className={BTN_GHOST}
                >
                  다시 복사하기
                </button>
                <button type="button" onClick={resetAll} className={BTN_GHOST}>
                  처음부터 다시 하기
                </button>
              </div>
            </div>
          )}
          {copyState === "failed" && (
            <p className={STATUS_STRONG}>{COPY_FAIL_MSG}</p>
          )}
        </div>
      </section>

      {/* ③ AI로 분석하기 — 안내 전용. 버튼이 없다. */}
      <section
        ref={sec3Ref}
        aria-labelledby="sec3-heading"
        className={`${CARD} ${nextUnlocked ? "" : "opacity-40"}`}
      >
        <h2 id="sec3-heading" className={CARD_H2}>
          AI로 분석하기
        </h2>
        {/* 순서가 뜻을 갖는 목록이라 ol 로 둔다. 번호 뱃지는 시각 표현이므로 숨긴다. */}
        <ol role="list" className="mt-[1.1rem] grid list-none gap-[0.75rem]">
          <li className={GUIDE_ITEM}>
            <span aria-hidden="true" className={GUIDE_NUM}>
              1
            </span>
            <p className="text-[0.95rem]">
              Claude, ChatGPT, Gemini 등 AI 서비스를 열어주세요. 되도록 높은 성능
              모델을 고르고, &#39;생각하기&#39;나 &#39;추론&#39; 기능이 있으면 켜
              주세요.
            </p>
          </li>
          <li className={GUIDE_ITEM}>
            <span aria-hidden="true" className={GUIDE_NUM}>
              2
            </span>
            <p className="text-[0.95rem]">
              대화창에{" "}
              <span className="font-extrabold text-navy-900">
                「지침을 따라 비평 리포트 &#39;초안&#39;을 작성해줘」
              </span>
              라고 써주세요.
            </p>
          </li>
          <li className={GUIDE_ITEM}>
            <span aria-hidden="true" className={GUIDE_NUM}>
              3
            </span>
            <p className="text-[0.95rem]">
              조금 전 복사한 분석 요청문을 붙여넣고 엔터(메시지 보내기)를 누르세요.
              긴 글이라 첨부 문서 파일처럼 보일 수 있어요. AI 서비스가 긴 글을
              문서로 정리해 받는 것이니, 그대로 진행하면 돼요.
            </p>
          </li>
        </ol>
        <p className={SMALL_NOTE}>
          시민용·기자용·학생용 리포트가 차례로 나와요. 글이 길어 중간에 멈추면
          &quot;계속해줘&quot;라고 말해주세요. 맨 끝에 「— 비평 리포트 초안 끝 —」이
          보이면 완성된 거예요.
        </p>
      </section>

      {/* ④ 초안을 '비평 리포트'로 완성하기 — '리포트 보내기' 버튼을 두지 않는다. */}
      <section
        ref={sec4Ref}
        aria-labelledby="sec4-heading"
        className={`${CARD} ${nextUnlocked ? "" : "opacity-40"}`}
      >
        <h2 id="sec4-heading" className={CARD_H2}>
          초안을 &#39;비평 리포트&#39;로 완성하기
        </h2>
        <p className={HINT}>
          AI가 문제 패턴을 잘못 짚거나 윤리규범 조항을 잘못 인용할 수 있어요.
          여러분이 직접 검수해 리포트를 완성해 주세요.
        </p>

        <div className="mt-4 grid gap-[0.55rem]">
          <label className={CHECK_ITEM}>
            <input
              type="checkbox"
              className="mt-[0.2rem] h-[1.2rem] w-[1.2rem] flex-none accent-navy-800"
            />
            <span>리포트가 인용한 기사 문장이 실제 기사에 있나요?</span>
          </label>
          <label className={CHECK_ITEM}>
            <input
              type="checkbox"
              className="mt-[0.2rem] h-[1.2rem] w-[1.2rem] flex-none accent-navy-800"
            />
            <span>
              리포트에 인용된 윤리규범이 실제 규범과 맞나요?
              <small className={CHECK_SUB}>
                <a
                  href="https://www.journalist.or.kr/news/section4.html?p_num=21"
                  target="_blank"
                  rel="noopener"
                  className="underline underline-offset-2 hover:text-navy-800 focus-visible:rounded-md focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                >
                  한국기자협회
                </a>
                에서 규범 이름과 조항을 직접 확인해 주세요.
              </small>
            </span>
          </label>
          <label className={CHECK_ITEM}>
            <input
              type="checkbox"
              className="mt-[0.2rem] h-[1.2rem] w-[1.2rem] flex-none accent-navy-800"
            />
            <span>
              AI가 놓치거나 잘못 잡아낸 문제는 없나요?
              <small className={CHECK_SUB}>
                문제가 있다면 관련 윤리규범 조항과 연결해 바로잡아 주세요.
              </small>
            </span>
          </label>
        </div>

        <p className="mt-[1.1rem] border-l-[3px] border-navy-200 py-[0.2rem] pl-4 text-[0.95rem] text-navy-700">
          리포트에 언급된 언론윤리규범이 어떤 저널리즘의 원칙과 가치를 지키기 위한
          것인지, 규범이 지켜지지 않을 때 어떤 가치가 함께 흔들릴 수 있는지 생각해
          보세요. 그 생각을 덧붙이는 것이 이 프로젝트를 완성시킵니다.
        </p>
        <p className="mt-[1.2rem] text-[0.92rem] text-navy-600">
          완성한 리포트를 더 널리 알리고 싶다면, 아래 &#39;리포트 보내기&#39; 메일로
          보내주세요.
        </p>
      </section>

      {/* Q&A — 단계 카드가 아니라 별도 섹션이다. 잠금 없음. */}
      <section aria-labelledby="qa-heading" className="mt-[2.7rem]">
        <h2
          id="qa-heading"
          className="mb-[0.3rem] text-[0.95rem] font-bold text-navy-600"
        >
          Q &amp; A
        </h2>
        <details className="px-[0.1rem] py-2">
          <summary className="cursor-pointer text-[0.9rem] font-semibold text-navy-600 outline-none focus-visible:rounded-md focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-500">
            기사 내용이 어딘가에 저장되나요?
          </summary>
          <p className="mt-[0.45rem] text-[0.88rem] text-navy-600">
            아니요. 분석 요청문을 만들어 전할 뿐, 기사 주소와 본문은 서버에 남지
            않아요.
          </p>
        </details>
        <details className="px-[0.1rem] py-2">
          <summary className="cursor-pointer text-[0.9rem] font-semibold text-navy-600 outline-none focus-visible:rounded-md focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-500">
            어떤 AI가 제일 잘하나요?
          </summary>
          <p className="mt-[0.45rem] text-[0.88rem] text-navy-600">
            모델 이름이 자주 바뀌어서 딱 하나를 말씀드리긴 어려워요. 각 서비스에서
            가장 높은 등급의 모델을 고르시면 됩니다.
          </p>
        </details>
        <details className="px-[0.1rem] py-2">
          <summary className="cursor-pointer text-[0.9rem] font-semibold text-navy-600 outline-none focus-visible:rounded-md focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-500">
            왜 &#39;초안&#39;이라고 부르나요?
          </summary>
          <p className="mt-[0.45rem] text-[0.88rem] text-navy-600">
            AI가 쓴 글이 자연스러워 보여도, 내용까지 정확하다는 뜻은 아니에요. 사실
            확인은 사람이 해야 해요. 시민의 검수를 거쳐야 비로소 리포트가
            완성됩니다.
          </p>
        </details>
      </section>
    </>
  );
}

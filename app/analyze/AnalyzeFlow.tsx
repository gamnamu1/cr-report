"use client";

import { useEffect, useRef, useState } from "react";

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

  /** 서버가 준 원본. 시민 편집으로 덮어쓰지 않는다. */
  const serverArticleRef = useRef<ConfirmedArticle | null>(null);
  /** 시민이 '기사 불러오기'를 눌렀던 원 URL. §3-4 3분기의 근거라 입력칸과 따로 둔다. */
  const submittedUrlRef = useRef<string | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sec2Ref = useRef<HTMLElement>(null);
  const sec2HeadingRef = useRef<HTMLHeadingElement>(null);
  const manualTitleRef = useRef<HTMLInputElement>(null);

  const locked = confirmed === null;

  // 잠긴 카드는 inert 로 막는다(opacity·pointer-events·aria-hidden 조합을 쓰지 않는다).
  // inert 를 먼저 풀어야 뒤이은 focus() 가 먹는다 — 순서를 바꾸지 말 것.
  useEffect(() => {
    const el = sec2Ref.current;
    if (el) (el as HTMLElement & { inert: boolean }).inert = locked;
    if (locked) return;
    sec2HeadingRef.current?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [locked]);

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

  const incomplete =
    confirmed !== null &&
    (!confirmed.publisher || !confirmed.journalist || !confirmed.publishDate);

  return (
    <>
      {/* ① 분석할 기사 주소를 넣어주세요 */}
      <section className={CARD} aria-labelledby="sec1-heading">
        <h2 id="sec1-heading" className={CARD_H2}>
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
      </section>
    </>
  );
}

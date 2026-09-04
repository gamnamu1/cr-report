/**
 * 사이트 노출 플래그.
 *
 * 이 플래그 하나가 풋터의 '기사 분석하기' 노출 · sitemap 등재 · `/analyze` 색인
 * 여부를 함께 제어한다. 노출 제어 플래그를 이것 말고 더 만들지 않는다.
 */

/** 서버 전용. NEXT_PUBLIC_ 을 쓰지 않는다 — 값은 서버에서 읽어 prop 으로 내려보낸다. */
export const ANALYZE_PUBLIC = process.env.ANALYZE_PUBLIC === "true";

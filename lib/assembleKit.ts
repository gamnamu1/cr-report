/**
 * 키트와 기사를 하나의 '분석 요청문' 문자열로 조립한다(지시서 §3-4, 동결).
 *
 * 순수 함수다. 키트 원문을 import 하지 않고 인자로 받으므로 서버·클라이언트
 * 어느 쪽에서 불러도 안전하다. 복사와 TXT 저장은 반드시 이 함수가 돌려준
 * 같은 문자열을 쓴다.
 */

/** 값이 없을 때 기사 정보 칸에 넣는 표기. */
const UNKNOWN = "미확인";
/** 보존할 원 URL 이 없을 때 '주소' 칸에 넣는 표기. */
const DIRECT_INPUT = "(직접 입력)";

export interface AssembleKitArgs {
  preamble: string;
  postamble: string;
  version: string;
  article: {
    title: string;
    content: string;
    publisher: string | null;
    journalist: string | null;
    publishDate: string | null;
  };
  /**
   * §3-4 '주소' 3분기의 결과값.
   * - 자동 추출 성공: 응답의 article.url
   * - 추출 실패 후 직접 입력: 시민이 최초에 넣었던 URL
   * - 처음부터 직접 입력: null → "(직접 입력)"
   */
  sourceUrl: string | null;
}

function orUnknown(value: string | null): string {
  return value && value.trim() !== "" ? value : UNKNOWN;
}

export function assembleKit({
  preamble,
  postamble,
  version,
  article,
  sourceUrl,
}: AssembleKitArgs): string {
  // 맨 앞 빈 줄 2개를 제거하지 않는다. 마지막 줄은 반드시 `[버전] …` 이다.
  return [
    "",
    "",
    preamble,
    "",
    "[기사 정보]",
    `제목: ${article.title}`,
    `매체: ${orUnknown(article.publisher)}`,
    `기자: ${orUnknown(article.journalist)}`,
    `게재일: ${orUnknown(article.publishDate)}`,
    `주소: ${sourceUrl && sourceUrl.trim() !== "" ? sourceUrl : DIRECT_INPUT}`,
    "",
    "[기사 본문]",
    article.content,
    "",
    postamble,
    "",
    `[버전] ${version}`,
  ].join("\n");
}

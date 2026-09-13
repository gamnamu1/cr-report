/**
 * 홈 검색용 텍스트 생성과 정규화 규칙을 모은 순수 모듈.
 *
 * 외부 호출·DB 조회·환경변수·React 상태에 의존하지 않는다. 입력 객체를
 * 수정하지 않는다. 서버(app/page.tsx)가 `searchText` 를 만들 때와 클라이언트가
 * 검색어를 정규화할 때 **같은 규칙**을 써야 하므로 규칙은 전부 이 파일에 둔다.
 *
 * 목표는 특정 매체·기자의 리포트를 모아 찾는 일을 쉽게 만들지 않는 것이다.
 * 공개 출처의 비공개화나 수집 차단이 아니다. 상세 리포트의 출처 표시와 DB
 * 원본은 그대로 두고, 검색용 사본에서만 해당 행의 이름을 덜어낸다.
 *
 * 알려진 한계(의도한 설계):
 * - 인명 인식이나 전국 매체·기자 사전을 두지 않는다. 근거는 **그 행에 이미 있는**
 *   `publisher`·`journalist` 메타데이터뿐이다.
 * - 따라서 기자 이름과 같은 글자가 같은 리포트 안에서 일반 낱말로 쓰이면 그
 *   낱말도 함께 빠진다. 단순 치환의 구별 한계이며 이번 범위에서 해소하지 않는다.
 * - 다른 리포트에 인물로 등장하는 같은 이름은 막지 않는다(전역 금칙어 아님).
 */

/**
 * `buildReportSearchText` 가 읽는 필드만 추린 구조. `lib/supabase` 를 import
 * 하지 않으려고 별도로 둔다 — 이 모듈은 어떤 런타임에도 의존하지 않는다.
 */
export interface ReportSearchSource {
  title?: string | null;
  publisher?: string | null;
  journalist?: string | null;
  comprehensive_report?: string | null;
}

/** 이 길이(공백 제외) 미만인 이름은 제외 대상으로 쓰지 않는다. 한 글자를
 *  덜어내면 본문이 잘게 부서져 검색이 망가진다. */
const MIN_TERM_LENGTH = 2;

/**
 * 이름이 아니라 '값이 없음'을 뜻하는 자리표시자. 정규화한 값과 비교한다.
 * 이 목록은 매체·기자 사전이 아니라 빈 값 표기 모음이다.
 */
const PLACEHOLDER_TERMS = new Set([
  "미확인",
  "매체 미확인",
  "기자 미확인",
  "미상",
  "알 수 없음",
  "알수없음",
  "unknown",
  "n/a",
  "없음",
  "-",
  "–",
  "—",
]);

/**
 * 공동 취재 표기의 이름 구분자.
 *
 * 운영 데이터에서 실제로 쓰이는 것은 가운뎃점(U+00B7)이고, 계획서가 예로 든
 * 쉼표 표기를 함께 받는다. 나머지는 같은 모양의 문자 변형이다.
 * `ㆍ`(U+318D)는 NFKC 로 U+119E 가 되므로 둘 다 넣는다.
 *
 * 공백은 구분자로 쓰지 않는다 — `김 하늘` 같은 표기를 두 사람으로 쪼개면
 * 한 글자짜리 제외어가 생겨 본문이 망가진다.
 */
const NAME_SEPARATOR_PATTERN = /[·ㆍᆞ・･,、;/]+/;

/** 이름 뒤에 붙는 직함 표기. 긴 것부터 벗겨야 `선임기자`가 `선임`으로 남지 않는다. */
const PRESS_TITLES = [
  "선임기자",
  "수습기자",
  "전문기자",
  "객원기자",
  "사진기자",
  "영상기자",
  "취재기자",
  "인턴기자",
  "논설위원",
  "편집위원",
  "특파원",
  "기자",
];

/** 이름 앞뒤에 남는 따옴표·괄호·마침표 따위. */
const EDGE_PUNCTUATION = /^[\s"'`([{<]+|[\s"'`)\]}>.]+$/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 검색용 문자열과 검색어에 똑같이 적용하는 기본 정규화.
 * Unicode NFKC → 소문자 → 연속 공백 한 칸 → 앞뒤 공백 제거.
 */
export function normalizeSearchText(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** 정규화가 끝난 값이 자리표시자인지. */
function isPlaceholder(normalized: string): boolean {
  return PLACEHOLDER_TERMS.has(normalized);
}

/** 제외어로 쓸 수 있는 값인지(자리표시자가 아니고 두 글자 이상). */
function isUsableTerm(normalized: string): boolean {
  if (normalized === "" || isPlaceholder(normalized)) return false;
  return normalized.replace(/\s+/g, "").length >= MIN_TERM_LENGTH;
}

/** 끝에 붙은 직함을 반복해서 벗긴다. `강한 기자` → `강한`, `기자` → ``. */
function stripPressTitle(part: string): string {
  let out = part.trim();
  for (;;) {
    const before = out;
    for (const title of PRESS_TITLES) {
      if (out.endsWith(title)) {
        out = out.slice(0, out.length - title.length).trim();
        break;
      }
    }
    if (out === before) return out;
  }
}

/**
 * `journalist` 한 칸에 담긴 표기를 개인 이름들로 나눈다.
 *
 * `박재현·이밝음 기자` → `["박재현", "이밝음"]`
 * `홍길동 기자, 김하늘 기자` → `["홍길동", "김하늘"]`
 *
 * 직함만 남는 조각(`기자`)은 빈 문자열이 되어 걸러진다. 일반 낱말인 `기자`를
 * 전역 금칙어로 만들지 않기 위해 반드시 필요한 처리다.
 */
export function splitJournalistNames(
  journalist: string | null | undefined
): string[] {
  const normalized = normalizeSearchText(journalist);
  if (normalized === "" || isPlaceholder(normalized)) return [];

  const names: string[] = [];
  for (const rawPart of normalized.split(NAME_SEPARATOR_PATTERN)) {
    const name = stripPressTitle(rawPart).replace(EDGE_PUNCTUATION, "").trim();
    if (isUsableTerm(name) && !names.includes(name)) names.push(name);
  }
  return names;
}

/**
 * 이 행의 검색용 텍스트에서 덜어낼 표기들. 긴 것부터 처리해야
 * `박재현·이밝음 기자` 가 `박재현` 보다 먼저 지워진다.
 */
export function collectExcludedTerms(source: ReportSearchSource): string[] {
  const terms: string[] = [];
  const add = (value: string) => {
    if (isUsableTerm(value) && !terms.includes(value)) terms.push(value);
  };

  add(normalizeSearchText(source.publisher));

  const names = splitJournalistNames(source.journalist);
  if (names.length > 0) {
    // 바이라인 통째 표기(`강한 기자`)를 개별 이름보다 먼저 지우려고 함께 담는다.
    // 이름이 하나도 나오지 않는 값(`기자`처럼 직함뿐인 경우)은 담지 않는다.
    // 담으면 일반 낱말이 그 리포트에서 통째로 사라진다.
    add(normalizeSearchText(source.journalist));
    for (const name of names) add(name);
  }

  return terms.sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * 표기 하나를 찾는 정규식. 저장값의 공백 유무 변형을 함께 처리하려고 글자
 * 사이에 공백을 허용한다(`연합뉴스` 가 `연합 뉴스` 로 적혀 있어도 걸린다).
 * 메타문자는 글자 단위로 이스케이프한다.
 */
function buildLooseTermPattern(term: string): RegExp {
  const chars = Array.from(term.replace(/\s+/g, "")).map(escapeRegExp);
  return new RegExp(chars.join("\\s*"), "g");
}

/**
 * 링크의 '주소' 부분만 덜어낸다. 표시 문구는 남긴다.
 * 지금 쓰이는 형식(인라인 마크다운 링크·자동 링크·본문에 노출된 http 주소)만
 * 다루고 범용 마크다운 파서를 만들지 않는다.
 */
function stripLinkTargets(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, " $1 ")
    .replace(/<https?:\/\/[^>\s]*>/g, " ")
    .replace(/https?:\/\/\S*/g, " ");
}

/**
 * 표시용 원문과 분리한 검색용 텍스트를 만든다.
 *
 * 재료는 기사 제목과 시민용 종합 리포트 본문뿐이다. 원문 URL 필드(`url`)는
 * 애초에 넣지 않으므로 주소로는 검색되지 않는다.
 *
 * 입력 객체는 수정하지 않는다.
 */
export function buildReportSearchText(source: ReportSearchSource): string {
  const base = `${source.title ?? ""} ${source.comprehensive_report ?? ""}`;
  let text = stripLinkTargets(normalizeSearchText(base));

  for (const term of collectExcludedTerms(source)) {
    // 빈 문자열이 아니라 공백으로 바꾼다 — 앞뒤 낱말이 붙어 없던 검색어가
    // 생기는 것을 막는다(`보강한다면` → `보 다면`).
    text = text.replace(buildLooseTermPattern(term), " ");
  }

  return normalizeSearchText(text);
}

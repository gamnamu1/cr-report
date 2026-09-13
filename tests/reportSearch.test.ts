/**
 * lib/reportSearch 회귀 테스트.
 *
 * 외부 서비스 없이 고정 fixture 로만 돈다. 전용 테스트 프레임워크를 새로 깔지
 * 않고 Node 기본 `node:test`/`node:assert` 를 쓴다. 실행 방법은 결과 보고서의
 * 재현 명령 참고.
 *
 * 여기서 덮는 범위는 완료 기준 S1~S6 중 **순수 함수로 검증 가능한 부분**이다.
 * S7(안내·0건)·S8(URL 복귀)·S9(서버 전달 경계)는 화면과 연결 코드에서 확인한다.
 *
 * fixture 의 이름·매체는 형태만 본뜬 가공값이다. 운영 원본을 그대로 옮기지 않는다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildReportSearchText,
  collectExcludedTerms,
  normalizeSearchText,
  splitJournalistNames,
  type ReportSearchSource,
} from "../lib/reportSearch";

/** 검색어도 같은 정규화를 거친다는 전제로, 화면과 같은 방식으로 맞춰 본다. */
function matches(searchText: string, query: string): boolean {
  const normalized = normalizeSearchText(query);
  if (normalized === "") return true;
  return normalized
    .split(" ")
    .filter(Boolean)
    .every((token) => searchText.includes(token));
}

// ---------------------------------------------------------------- S1

test("S1 매체명·기자명은 검색용 텍스트에서 빠진다", () => {
  const source: ReportSearchSource = {
    title: "보완수사권 폐지 논쟁, 무엇이 빠졌나",
    publisher: "연합뉴스",
    journalist: "박재현·이밝음 기자",
    comprehensive_report: "이 기사는 제도 변화의 맥락을 충분히 설명하지 않습니다.",
  };

  const searchText = buildReportSearchText(source);

  assert.equal(matches(searchText, "연합뉴스"), false);
  assert.equal(matches(searchText, "박재현"), false);
  assert.equal(matches(searchText, "이밝음"), false);
  // 주제어는 그대로 찾을 수 있어야 한다.
  assert.equal(matches(searchText, "보완수사권"), true);
  assert.equal(matches(searchText, "제도 변화"), true);
});

test("S1 원본 필드는 그대로 남는다(표시용 출처 보존)", () => {
  const source: ReportSearchSource = {
    title: "제목",
    publisher: "연합뉴스",
    journalist: "박재현 기자",
    comprehensive_report: "본문",
  };
  buildReportSearchText(source);

  assert.equal(source.publisher, "연합뉴스");
  assert.equal(source.journalist, "박재현 기자");
});

// ---------------------------------------------------------------- S2

test("S2 제목·본문에 반복된 기자 이름도 함께 빠진다", () => {
  const searchText = buildReportSearchText({
    title: "박재현 기자가 쓴 기사",
    publisher: "연합뉴스",
    journalist: "박재현 기자",
    comprehensive_report:
      "박재현 기자의 기사입니다. 박재현 은 여러 번 등장합니다. 검찰 개혁이 핵심입니다.",
  });

  assert.equal(matches(searchText, "박재현"), false);
  assert.equal(matches(searchText, "검찰 개혁"), true);
});

test("S2 이름의 일부도 원래 이름 자리에는 남지 않는다", () => {
  const searchText = buildReportSearchText({
    title: "수사 관행을 다시 본다",
    publisher: "한국일보",
    journalist: "김혜영 기자",
    comprehensive_report: "김혜영 기자가 취재했습니다.",
  });

  assert.equal(searchText.includes("김혜"), false);
  assert.equal(searchText.includes("혜영"), false);
  assert.equal(matches(searchText, "수사 관행"), true);
});

// ---------------------------------------------------------------- S3

test("S3 공동 취재 표기를 개인 이름으로 나눈다", () => {
  assert.deepEqual(splitJournalistNames("박재현·이밝음 기자"), [
    "박재현",
    "이밝음",
  ]);
  assert.deepEqual(splitJournalistNames("홍길동 기자, 김하늘 기자"), [
    "홍길동",
    "김하늘",
  ]);
  // ㆍ(U+318D)는 NFKC 로 U+119E 가 된다. 둘 다 구분자로 받는다.
  assert.deepEqual(splitJournalistNames("홍길동ㆍ김하늘 기자"), [
    "홍길동",
    "김하늘",
  ]);
});

test("S3 뒤에 붙은 직함을 벗긴다", () => {
  assert.deepEqual(splitJournalistNames("홍길동 선임기자"), ["홍길동"]);
  assert.deepEqual(splitJournalistNames("홍길동 특파원"), ["홍길동"]);
  assert.deepEqual(splitJournalistNames("홍길동기자"), ["홍길동"]);
});

test("S3 직함만 있는 값은 제외어가 되지 않는다", () => {
  assert.deepEqual(splitJournalistNames("기자"), []);

  // '기자'가 전역 금칙어가 되면 안 된다.
  const searchText = buildReportSearchText({
    title: "기자와 취재원의 거리",
    publisher: "뉴스핌",
    journalist: "기자",
    comprehensive_report: "기자가 지켜야 할 원칙을 살펴봅니다.",
  });
  assert.equal(matches(searchText, "기자"), true);
});

test("S3 저장값의 공백 유무 변형도 처리한다", () => {
  const searchText = buildReportSearchText({
    title: "제목",
    publisher: "연합뉴스",
    journalist: "박재현 기자",
    // 본문에는 공백을 넣어 적혀 있다.
    comprehensive_report: "연합 뉴스 보도에 따르면 박 재현 기자가 확인했습니다.",
  });

  assert.equal(matches(searchText, "연합뉴스"), false);
  assert.equal(searchText.includes("연합"), false);
  assert.equal(searchText.includes("재현"), false);
});

test("S3 영문 대소문자와 NFKC 변형을 함께 처리한다", () => {
  const searchText = buildReportSearchText({
    // 전각으로 적힌 매체명도 NFKC 로 같은 글자가 된다.
    title: "ＢＢＣ Ｎｅｗｓ 보도 다시 읽기",
    publisher: "BBC News",
    journalist: "Jane Doe",
    comprehensive_report: "bbc news 는 이 사안을 이렇게 전했습니다. JANE DOE 기자.",
  });

  assert.equal(matches(searchText, "bbc news"), false);
  assert.equal(matches(searchText, "ＢＢＣ Ｎｅｗｓ"), false);
  assert.equal(matches(searchText, "jane doe"), false);
  assert.equal(matches(searchText, "보도 다시 읽기"), true);
});

test("S3 완전한 이름만 제외한다 — 부분 표기는 막지 않는다", () => {
  // 계획서 3.2: 매체명은 '완전한 이름'을 제외한다. 확인되지 않은 별칭·약칭을
  // 편의로 금칙어에 넣지 않는다(`중앙`, `한국` 같은 일반어 차단 방지).
  const searchText = buildReportSearchText({
    title: "BBC 단독 보도의 무게",
    publisher: "BBC News",
    journalist: "Jane Doe",
    comprehensive_report: "한국경제 기사가 아니라 한국 경제 전반을 다룹니다.",
  });

  assert.equal(matches(searchText, "bbc"), true);
  assert.equal(matches(searchText, "bbc news"), false);
});

test("S3 null·빈 값·미확인은 제외할 이름으로 보지 않는다", () => {
  assert.deepEqual(splitJournalistNames(null), []);
  assert.deepEqual(splitJournalistNames(undefined), []);
  assert.deepEqual(splitJournalistNames(""), []);
  assert.deepEqual(splitJournalistNames("미확인"), []);

  const searchText = buildReportSearchText({
    title: "매체 미확인 기사 검토",
    publisher: "미확인",
    journalist: null,
    comprehensive_report: "출처가 미확인 상태입니다.",
  });

  // '미확인'이 통째로 지워져 본문이 사라지면 안 된다.
  assert.equal(matches(searchText, "미확인"), true);
  assert.deepEqual(collectExcludedTerms({ publisher: "미확인" }), []);
});

test("S3 한 글자 값은 제외어로 쓰지 않는다", () => {
  assert.deepEqual(collectExcludedTerms({ publisher: "김", journalist: "이" }), []);
});

// ---------------------------------------------------------------- S4

test("S4 링크의 주소만 빠지고 표시 문구는 남는다", () => {
  const searchText = buildReportSearchText({
    title: "제목",
    publisher: "한국경제",
    journalist: "이정우 기자",
    comprehensive_report:
      "자세한 내용은 [무죄율 통계 원자료](https://example.com/stats/2026)에서 볼 수 있습니다.",
  });

  assert.equal(matches(searchText, "무죄율 통계 원자료"), true);
  assert.equal(matches(searchText, "example.com"), false);
  assert.equal(matches(searchText, "https"), false);
});

test("S4 본문에 노출된 주소와 자동 링크도 빠진다", () => {
  const searchText = buildReportSearchText({
    title: "제목",
    publisher: "뉴스핌",
    journalist: "홍석희 기자",
    comprehensive_report:
      "원문 https://www.newspim.com/news/view/20260731 과 <https://example.org/b> 를 함께 봅니다.",
  });

  assert.equal(matches(searchText, "newspim.com"), false);
  assert.equal(matches(searchText, "example.org"), false);
  assert.equal(matches(searchText, "원문"), true);
});

test("S4 원문 URL 필드는 애초에 검색 재료가 아니다", () => {
  // url 은 ReportSearchSource 에 없다. 넘겨도 검색용 텍스트에 들어가지 않는다.
  const source = {
    title: "제목",
    publisher: "문화일보",
    journalist: "강한 기자",
    comprehensive_report: "본문입니다.",
    url: "https://www.munhwa.com/article/11607116",
  };

  const searchText = buildReportSearchText(source);
  assert.equal(matches(searchText, "munhwa.com"), false);
  assert.equal(matches(searchText, "11607116"), false);
});

// ---------------------------------------------------------------- S5

test("S5 이름을 덜어내도 앞뒤 낱말이 붙지 않는다", () => {
  // 실제 운영 데이터에 있는 모양: 기자 이름 '강한'이 '보강한다면' 안에 걸린다.
  const searchText = buildReportSearchText({
    title: "제목",
    publisher: "문화일보",
    journalist: "강한 기자",
    comprehensive_report: "근거와 출처를 보강한다면 설득력이 높아집니다.",
  });

  assert.equal(searchText.includes("보다면"), false);
  assert.equal(matches(searchText, "설득력"), true);
});

test("S5 입력 객체를 수정하지 않는다", () => {
  const source: ReportSearchSource = {
    title: "박재현 기자의 기사",
    publisher: "연합뉴스",
    journalist: "박재현·이밝음 기자",
    comprehensive_report: "연합뉴스 보도입니다.",
  };
  const snapshot = JSON.parse(JSON.stringify(source));

  buildReportSearchText(source);
  buildReportSearchText(source);

  assert.deepEqual(source, snapshot);
});

test("S5 일반 낱말을 전역으로 막지 않는다", () => {
  const searchText = buildReportSearchText({
    title: "뉴스와 신문, 그리고 기자",
    publisher: "뉴스핌",
    journalist: "홍석희 기자",
    comprehensive_report:
      "중앙 일간지의 뉴스 편집과 신문 지면, 기자의 역할을 살펴봅니다.",
  });

  assert.equal(matches(searchText, "뉴스"), true);
  assert.equal(matches(searchText, "신문"), true);
  assert.equal(matches(searchText, "기자"), true);
  assert.equal(matches(searchText, "중앙"), true);
});

test("S5 같은 결과를 반복해서 만들 수 있다", () => {
  const source: ReportSearchSource = {
    title: "제목",
    publisher: "연합뉴스",
    journalist: "박재현 기자",
    comprehensive_report: "본문",
  };
  assert.equal(buildReportSearchText(source), buildReportSearchText(source));
});

// ---------------------------------------------------------------- S6

test("S6 다른 리포트의 기사 속 인물은 막지 않는다", () => {
  // A: 작성 기자가 '강한' → A 에서는 빠진다.
  const a = buildReportSearchText({
    title: "경찰 수사 지휘 논란",
    publisher: "문화일보",
    journalist: "강한 기자",
    comprehensive_report: "강한 표현이 반복됩니다.",
  });
  // B: 작성 기자가 다른 사람이고 '강한'은 기사 속 낱말 → B 에서는 남는다.
  const b = buildReportSearchText({
    title: "같은 사안, 다른 시선",
    publisher: "한국일보",
    journalist: "김혜영 기자",
    comprehensive_report: "강한 어조의 제목이 쓰였습니다.",
  });

  assert.equal(matches(a, "강한"), false);
  assert.equal(matches(b, "강한"), true);
});

test("S6 혼합 검색어에서 이름만 몰래 빼고 검색하지 않는다", () => {
  const searchText = buildReportSearchText({
    title: "검찰 수사권 조정",
    publisher: "연합뉴스",
    journalist: "박재현 기자",
    comprehensive_report: "수사권 조정의 쟁점을 정리합니다.",
  });

  // '연합뉴스 수사권' → 토큰 AND. 매체명 토큰이 없으니 결과가 없다.
  assert.equal(matches(searchText, "연합뉴스 수사권"), false);
  assert.equal(matches(searchText, "수사권"), true);
});

// ---------------------------------------------------------------- 정규화

test("검색어와 검색용 텍스트에 같은 정규화가 걸린다", () => {
  assert.equal(normalizeSearchText("  검찰   개혁 "), "검찰 개혁");
  assert.equal(normalizeSearchText("ＡＢＣ"), "abc");
  assert.equal(normalizeSearchText("A B"), "a b");
  assert.equal(normalizeSearchText(null), "");
  assert.equal(normalizeSearchText(undefined), "");
});

test("제외어는 긴 표기부터 처리한다", () => {
  const terms = collectExcludedTerms({
    publisher: "연합뉴스",
    journalist: "박재현·이밝음 기자",
  });
  for (let i = 1; i < terms.length; i += 1) {
    assert.ok(terms[i - 1].length >= terms[i].length);
  }
  assert.ok(terms.includes("박재현"));
  assert.ok(terms.includes("이밝음"));
  assert.ok(terms.includes("연합뉴스"));
});

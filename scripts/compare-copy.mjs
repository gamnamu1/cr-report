#!/usr/bin/env node
/**
 * 목업 정본의 사용자 노출 문구가 구현에 실제로 들어갔는지 대조한다.
 *
 *   node scripts/compare-copy.mjs <목업 HTML 경로>
 *   MOCKUP_HTML=<경로> node scripts/compare-copy.mjs
 *
 * 검사 방향은 한쪽이다: 목업 → 구현. 구현 → 목업 역방향(구현에만 있는 문구를
 * 모두 찾아내는 검사)은 TSX 파싱이 필요해 하지 않는다.
 *
 * 절대경로를 코드에 넣지 않는다 — 경로는 인자나 환경변수로 받는다.
 * Node 기본 기능만 쓰며 새 의존성이 없다.
 *
 * 대조 방식: 양쪽에서 공백을 모두 제거한 뒤 부분 문자열로 찾는다.
 * JSX 는 줄바꿈·{" "}·엔티티 때문에 소스 모양이 렌더 결과와 다르지만,
 * 공백을 지우면 그 차이가 사라지고 한국어 문장은 충분히 길어 오탐이 없다.
 *
 * 무차별 전체 비교는 하지 않는다. 제외 목록을 아래에 명시한다 —
 * 그렇게 하지 않으면 diff 를 통과시키려고 시연용 문구를 실제 페이지에
 * 집어넣는 역효과가 난다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/** 대조 대상 구현 파일. 조건부 렌더 문구까지 담기도록 소스를 본다. */
const IMPL_FILES = [
  "app/analyze/page.tsx",
  "app/analyze/AnalyzeFlow.tsx",
  "components/SiteFooter.tsx",
];

/**
 * 1) 목업에만 있어야 하는 문구 — 구현에 옮기지 않는다.
 *    시연용 컨트롤 / DEMO 데이터 / 대체된 오류 문구.
 *    (가짜 타이머와 alert() 문구는 <script> 안에 있어 추출 단계에서 이미 빠진다.)
 */
const MOCKUP_ONLY = [
  // demo-bar 시연 컨트롤
  "목업 시연:",
  "부분 성공",
  "복사 실패 켜기",
  // DEMO 기사 데이터
  "검찰 보완수사권 축소 1년",
  "한국시사신문",
  "김민준 기자",
  "2026년 8월 28일",
  "검찰의 보완수사권이 축소된 지 1년을 맞으면서",
  "목업 예시 본문",
  "검찰 관계자는",
  // 지시서 §5 로 대체된 목업의 옛 오류 문구 (기획자 결정)
  "이 기사는 자동으로 불러올 수 없었어요. 유료 기사이거나 접근이 막힌 페이지일 수 있어요.",
];

/**
 * 2) 구현 전용 허용/참고 목록 — 목업에 대응물이 없어도 되는 문구를 적어 둔다.
 *    지시서 §5 오류 문구 / 접근성 보조 문구 / 인라인 검증 / 프리페치 신규 문구.
 *
 *    이 배열은 검사에 쓰이지 않는다(역방향 검사가 없다). 나중에 역방향 검사를
 *    붙이거나 사람이 검토할 때 "이건 목업에 없어도 정상"임을 알리는 기록이다.
 */
const IMPLEMENTATION_ONLY = [
  // 프리페치 (목업에 없는 신규 흐름)
  "분석 요청문을 준비하고 있어요…",
  "분석 요청문이 준비됐어요.",
  "분석 자료를 불러오지 못했어요. '다시 시도'를 눌러 주세요.",
  // 지시서 §5 시민 노출 오류 문구
  "기사 주소 형식이 올바르지 않아요. 주소를 다시 확인해 주세요.",
  "이 주소는 불러올 수 없어요. 언론사나 포털의 기사 주소를 넣어 주세요.",
  "이 주소에서 기사 내용을 찾지 못했어요. 아래에서 직접 넣어 주세요.",
  "기사를 불러오지 못했어요. 주소를 다시 확인하시거나, 아래에서 직접 넣어 주세요.",
  "언론사 페이지의 응답이 너무 늦어요. 잠시 후 다시 시도하시거나, 아래에서 직접 넣어 주세요.",
  "요청이 잠시 몰렸어요. 1분쯤 뒤에 다시 눌러 주세요.",
  "지금은 기사를 불러올 수 없어요. 잠시 후 다시 시도하시거나, 아래에서 직접 넣어 주세요.",
  // alert() 를 대체한 인라인 검증 문구
  "기사 제목을 넣어 주세요.",
  "기사 본문을 넣어 주세요.",
  "기사 제목은 비워 둘 수 없어요.",
  "기사 본문은 비워 둘 수 없어요.",
  // 접근성 보조 라벨 (sr-only / aria-label / 좁은 화면 label)
  "기사 주소",
  "사이트 안내",
];

const squeeze = (s) => s.replace(/\s+/g, "");

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

/** 목업 body 에서 사용자에게 보이는 문구를 뽑는다. */
function extractMockupCopy(html) {
  let body = html.slice(html.indexOf("<body>"), html.indexOf("</body>"));
  body = body.replace(/<script[\s\S]*?<\/script>/gi, "");
  body = body.replace(/<style[\s\S]*?<\/style>/gi, "");
  // 시연 바는 통째로 제거한다(중첩 div 가 없어 비탐욕 매칭으로 정확히 끊긴다).
  body = body.replace(/<div class="demo-bar"[\s\S]*?<\/div>/i, "");

  const found = [];
  for (const m of body.matchAll(/placeholder="([^"]+)"/g)) found.push(m[1]);
  // 태그 사이의 텍스트 노드를 통째로 하나의 문구로 본다.
  // (공백으로 쪼개면 단어 조각이 되어 문장 단위 대조가 되지 않는다.)
  for (const node of body.split(/<[^>]+>/)) {
    const t = decode(node).replace(/\s+/g, " ").trim();
    if (t) found.push(t);
  }
  // 너무 짧은 조각은 대조 의미가 없다(오탐만 늘린다).
  return [...new Set(found)].filter((t) => squeeze(t).length >= 6);
}

function main() {
  const mockupPath = process.argv[2] || process.env.MOCKUP_HTML;
  if (!mockupPath) {
    console.error("사용법: node scripts/compare-copy.mjs <목업 HTML 경로>");
    console.error("        MOCKUP_HTML=<경로> node scripts/compare-copy.mjs");
    process.exit(2);
  }

  const html = readFileSync(mockupPath, "utf8");
  const haystack = squeeze(
    decode(IMPL_FILES.map((f) => readFileSync(join(ROOT, f), "utf8")).join("\n"))
  );

  const all = extractMockupCopy(html);
  const excluded = [];
  const checked = [];
  for (const t of all) {
    const hit = MOCKUP_ONLY.find(
      (x) => squeeze(t).includes(squeeze(x)) || squeeze(x).includes(squeeze(t))
    );
    if (hit) excluded.push(t);
    else checked.push(t);
  }

  const missing = checked.filter((t) => !haystack.includes(squeeze(t)));
  const leaked = MOCKUP_ONLY.filter((t) => haystack.includes(squeeze(t)));

  console.log(`목업        : ${mockupPath}`);
  console.log(`구현 대조 파일: ${IMPL_FILES.join(", ")}`);
  console.log("");
  console.log(`추출한 문구            ${all.length}건`);
  console.log(`제외 — 목업 전용        ${excluded.length}건`);
  console.log(`구현 전용 허용 목록(참고) ${IMPLEMENTATION_ONLY.length}건 — 검사에는 쓰이지 않음`);
  console.log(`대조 대상              ${checked.length}건`);
  console.log(`구현에 없음            ${missing.length}건`);
  console.log(`목업 전용 문구 유출     ${leaked.length}건`);
  console.log("");

  if (excluded.length) {
    console.log("-- 제외된 목업 전용 문구 --");
    for (const t of excluded) console.log(`   . ${JSON.stringify(t.slice(0, 56))}`);
    console.log("");
  }
  if (missing.length) {
    console.log("-- 구현에서 찾지 못한 목업 문구 --");
    for (const t of missing) console.log(`   X ${JSON.stringify(t)}`);
    console.log("");
  }
  if (leaked.length) {
    console.log("-- 구현으로 새어 든 목업 전용 문구 --");
    for (const t of leaked) console.log(`   X ${JSON.stringify(t)}`);
    console.log("");
  }

  const ok = missing.length === 0 && leaked.length === 0;
  console.log(
    ok
      ? "결과: 통과 — 목업 정본 문구가 모두 구현에 있고, 목업 전용 금지 문구가 구현에 새지 않았다."
      : "결과: 불일치 있음"
  );
  process.exit(ok ? 0 : 1);
}

main();

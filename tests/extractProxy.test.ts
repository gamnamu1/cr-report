/**
 * app/api/extract 중계 계약 회귀 테스트.
 *
 * 외부 서비스를 쓰지 않는다. `global.fetch` 를 대역으로 바꿔 상류 호출을
 * 관찰하고, 실제 기사 URL·메타데이터 서버·내부 주소로는 한 번도 나가지 않는다.
 * 전용 테스트 프레임워크를 새로 깔지 않고 Node 기본 `node:test`/`node:assert`
 * 를 쓴다(기존 tests/reportSearch.test.ts 와 같은 방식). 실행 방법은 결과
 * 보고서의 재현 명령 참고.
 *
 * 이 라우트는 환경변수를 **모듈 최상위에서** 읽는다. 그래서 시험마다
 * `require.cache` 에서 라우트 모듈을 지우고 다시 불러 그 판의 설정을 굳힌다.
 * env·fetch 는 시험이 끝나면 원래대로 되돌린다. 같은 전역 상태를 건드리므로
 * 병렬로 돌리지 않는다(node:test 의 기본 순차 실행에 맞춘다).
 *
 * 키·도메인은 전부 가짜다. 운영 키로 시험하지 않는다.
 */
import { mock, test } from "node:test";
import assert from "node:assert/strict";

const ROUTE_PATH = "../app/api/extract/route";

const FAKE_KEY = "test-proxy-key-0123456789abcdef";
const GOOD_BASE = "https://extractor.example.invalid";
const ARTICLE_URL = "https://example-news.co.kr/article/1234";

/** 라우트가 상류에 거는 제한 시간. route.ts 의 UPSTREAM_TIMEOUT_MS 와 같아야 한다. */
const UPSTREAM_TIMEOUT_MS = 17_000;

type PostHandler = (request: Request) => Promise<Response>;
type FetchCall = { url: string; init: RequestInit };

/** 이번 시험판에서 상류로 나간 호출 기록. */
let calls: FetchCall[] = [];

/** 상류 대역이 돌려줄 응답(또는 던질 오류)을 정하는 함수. */
type Upstream = (url: string, init: RequestInit) => Promise<Response>;

const defaultUpstream: Upstream = async () =>
  new Response(JSON.stringify({ ok: true, status: "success" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

/**
 * 주어진 환경변수로 라우트를 새로 적재하고 POST 를 한 번 호출한다.
 * 끝나면 env·fetch·모듈 캐시를 원래대로 되돌린다.
 */
async function callRoute(options: {
  base?: string;
  key?: string;
  body?: unknown;
  headers?: Record<string, string>;
  upstream?: Upstream;
}): Promise<Response> {
  const { base, key, body = { url: ARTICLE_URL }, headers = {}, upstream } = options;

  const savedBase = process.env.EXTRACT_API_BASE;
  const savedKey = process.env.EXTRACT_API_KEY;
  const savedFetch = globalThis.fetch;

  calls = [];

  if (base === undefined) delete process.env.EXTRACT_API_BASE;
  else process.env.EXTRACT_API_BASE = base;
  if (key === undefined) delete process.env.EXTRACT_API_KEY;
  else process.env.EXTRACT_API_KEY = key;

  const handler = upstream ?? defaultUpstream;
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    calls.push({ url, init: init ?? {} });
    return handler(url, init ?? {});
  }) as typeof globalThis.fetch;

  try {
    // 이 판의 환경변수로 모듈 최상위 상수를 다시 굳힌다.
    delete require.cache[require.resolve(ROUTE_PATH)];
    const mod = require(ROUTE_PATH) as { POST: PostHandler };

    const request = new Request("https://cr-report.kr/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    return await mod.POST(request);
  } finally {
    globalThis.fetch = savedFetch;
    if (savedBase === undefined) delete process.env.EXTRACT_API_BASE;
    else process.env.EXTRACT_API_BASE = savedBase;
    if (savedKey === undefined) delete process.env.EXTRACT_API_KEY;
    else process.env.EXTRACT_API_KEY = savedKey;
    delete require.cache[require.resolve(ROUTE_PATH)];
  }
}

/** 설정 실패는 전부 같은 모습이어야 한다 — 503 + 상류 호출 0회. */
async function assertClosed(response: Response, label: string) {
  assert.equal(response.status, 503, `${label}: 503 이어야 한다`);
  const body = (await response.json()) as { ok: boolean; code: string };
  assert.equal(body.ok, false, label);
  assert.equal(body.code, "EXTRACTOR_DISABLED", label);
  assert.equal(calls.length, 0, `${label}: 상류를 호출하면 안 된다`);
}

// --- 6.2 표: 설정이 없을 때 -------------------------------------------------

test("BASE 없음 + KEY 있음 → 503, 상류 호출 0회", async () => {
  await assertClosed(await callRoute({ base: undefined, key: FAKE_KEY }), "BASE 없음");
});

test("KEY 없음 + BASE 있음 → 503, 상류 호출 0회", async () => {
  await assertClosed(await callRoute({ base: GOOD_BASE, key: undefined }), "KEY 없음");
});

test("빈 값·공백뿐인 설정 → 503, 상류 호출 0회", async () => {
  for (const value of ["", "   ", "\t", "\n  "]) {
    await assertClosed(
      await callRoute({ base: value, key: FAKE_KEY }),
      `BASE=${JSON.stringify(value)}`
    );
    await assertClosed(
      await callRoute({ base: GOOD_BASE, key: value }),
      `KEY=${JSON.stringify(value)}`
    );
  }
});

// --- 6.2 표: 쓸 수 없는 BASE -----------------------------------------------

test("URL 로 해석되지 않는 BASE → 503", async () => {
  for (const value of ["extractor.example.invalid", "//extractor.example.invalid", "그냥 문자열", ":::"]) {
    await assertClosed(await callRoute({ base: value, key: FAKE_KEY }), `BASE=${value}`);
  }
});

test("http/https 가 아닌 스킴 → 503", async () => {
  for (const value of [
    "ftp://extractor.example.invalid",
    "file:///etc/passwd",
    "ws://extractor.example.invalid",
    "javascript:alert(1)",
  ]) {
    await assertClosed(await callRoute({ base: value, key: FAKE_KEY }), `BASE=${value}`);
  }
});

test("사용자명·암호가 들어간 BASE → 503", async () => {
  for (const value of [
    "https://user@extractor.example.invalid",
    "https://user:pass@extractor.example.invalid",
    "https://:pass@extractor.example.invalid",
  ]) {
    await assertClosed(await callRoute({ base: value, key: FAKE_KEY }), `BASE=${value}`);
  }
});

// `https://host/?` 와 `https://host/#` 은 URL 표준이 "query·fragment 없음"으로
// 정규화하므로 `https://host/` 와 같은 값이다. 그래서 거부 대상이 아니며,
// 아래 목록에도 넣지 않는다. 실제로 값이 붙은 경우만 막으면 된다.
test("query·fragment 가 들어간 BASE → 503", async () => {
  for (const value of [
    "https://extractor.example.invalid?a=1",
    "https://extractor.example.invalid/?a=1&b=2",
    "https://extractor.example.invalid/#frag",
    "https://extractor.example.invalid/#section/extract",
  ]) {
    await assertClosed(await callRoute({ base: value, key: FAKE_KEY }), `BASE=${value}`);
  }
});

test("경로가 루트가 아닌 BASE 는 /extract 포함해 전부 거부한다", async () => {
  for (const value of [
    "https://extractor.example.invalid/extract",
    "https://extractor.example.invalid/extract/",
    "https://extractor.example.invalid/api",
    "https://extractor.example.invalid/api/v1",
  ]) {
    await assertClosed(await callRoute({ base: value, key: FAKE_KEY }), `BASE=${value}`);
  }
});

// --- 6.2 표: 정상 BASE ------------------------------------------------------

test("앞뒤 공백·끝 슬래시를 정리해 /extract 를 정확히 한 번 붙인다", async () => {
  for (const value of [
    GOOD_BASE,
    `${GOOD_BASE}/`,
    `  ${GOOD_BASE}  `,
    `\t${GOOD_BASE}/\n`,
  ]) {
    const response = await callRoute({ base: value, key: FAKE_KEY });
    assert.equal(response.status, 200, `BASE=${JSON.stringify(value)}`);
    assert.equal(calls.length, 1, "상류 호출은 정확히 1회");
    assert.equal(calls[0].url, `${GOOD_BASE}/extract`, `BASE=${JSON.stringify(value)}`);

    // 부분문자열로 세지 않는다 — 이 도메인 이름 안에 "extract" 가 들어 있어
    // "//extractor…" 가 "//extract" 로 잘못 잡힌다. 경로를 직접 본다.
    const parsed = new URL(calls[0].url);
    assert.equal(parsed.pathname, "/extract", "경로가 정확히 /extract 한 번");
    assert.equal(parsed.search, "", "query 를 덧붙이지 않는다");
    assert.equal(parsed.hash, "", "fragment 를 덧붙이지 않는다");
  }
});

test("로컬 http origin 은 개발 연결 시험을 위해 허용한다", async () => {
  const response = await callRoute({ base: "http://127.0.0.1:8000", key: FAKE_KEY });
  assert.equal(response.status, 200);
  assert.equal(calls[0].url, "http://127.0.0.1:8000/extract");
});

test("포트가 있는 origin 을 보존한다", async () => {
  await callRoute({ base: "https://extractor.example.invalid:8443/", key: FAKE_KEY });
  assert.equal(calls[0].url, "https://extractor.example.invalid:8443/extract");
});

// --- 키 경계 ----------------------------------------------------------------

test("서버 키는 상류 요청 헤더로만 나가고 응답에는 없다", async () => {
  const response = await callRoute({ base: GOOD_BASE, key: FAKE_KEY });

  const sent = calls[0].init.headers as Record<string, string>;
  assert.equal(sent["X-CR-Extract-Key"], FAKE_KEY, "상류 헤더에 서버 키를 붙인다");

  const text = await response.text();
  assert.ok(!text.includes(FAKE_KEY), "응답 본문에 키가 없다");
  for (const [, value] of response.headers) {
    assert.ok(!String(value).includes(FAKE_KEY), "응답 헤더에 키가 없다");
  }
});

test("클라이언트가 보낸 헤더로 서버 키를 덮어쓸 수 없다", async () => {
  await callRoute({
    base: GOOD_BASE,
    key: FAKE_KEY,
    headers: { "X-CR-Extract-Key": "client-supplied-key" },
  });
  const sent = calls[0].init.headers as Record<string, string>;
  assert.equal(sent["X-CR-Extract-Key"], FAKE_KEY);
});

test("클라이언트 요청 본문이 추출 서버 주소를 고를 수 없다", async () => {
  await callRoute({
    base: GOOD_BASE,
    key: FAKE_KEY,
    body: { url: ARTICLE_URL, base: "https://attacker.example.invalid" },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${GOOD_BASE}/extract`);
  // 요청 본문의 url 은 예전과 같이 '대상 기사 주소'로 그대로 전달된다.
  assert.equal(JSON.parse(String(calls[0].init.body)).url, ARTICLE_URL);
});

// --- 상류 응답 전달 ---------------------------------------------------------

test("상류 200·부분성공·오류의 상태와 본문을 그대로 전달한다", async () => {
  const cases = [
    { status: 200, body: { ok: true, status: "success", article: { title: "제목" } } },
    { status: 200, body: { ok: true, status: "partial", warnings: [{ code: "JOURNALIST_NOT_FOUND" }] } },
    { status: 401, body: { ok: false, code: "UNAUTHORIZED_CALLER", message: "인증 실패" } },
    { status: 503, body: { ok: false, code: "EXTRACTOR_BUSY", message: "혼잡" } },
    { status: 422, body: { ok: false, code: "ARTICLE_NOT_FOUND", message: "본문 없음" } },
  ];

  for (const { status, body } of cases) {
    const response = await callRoute({
      base: GOOD_BASE,
      key: FAKE_KEY,
      upstream: async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
    });
    assert.equal(response.status, status, `상류 ${status}`);
    assert.deepEqual(await response.json(), body, `상류 ${status} 본문`);
  }
});

test("상류 연결 실패는 502 SOURCE_FETCH_FAILED", async () => {
  const response = await callRoute({
    base: GOOD_BASE,
    key: FAKE_KEY,
    upstream: async () => {
      throw new TypeError("fetch failed");
    },
  });
  assert.equal(response.status, 502);
  assert.equal(((await response.json()) as { code: string }).code, "SOURCE_FETCH_FAILED");
});

test("상류 타임아웃은 504 SOURCE_TIMEOUT", async () => {
  // 실제 서버를 끊거나 17초를 기다리지 않는다. 라우트가 거는 타이머를 가짜
  // 타이머로 당겨 AbortSignal 이 실제로 발동하게 만든다.
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const response = await callRoute({
      base: GOOD_BASE,
      key: FAKE_KEY,
      upstream: (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = init.signal as AbortSignal | undefined;
          assert.ok(signal, "라우트가 AbortSignal 을 붙여야 한다");
          signal.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
          // 라우트가 건 17초 타이머를 지금 터뜨린다.
          queueMicrotask(() => mock.timers.tick(UPSTREAM_TIMEOUT_MS));
        }),
    });

    assert.equal(response.status, 504);
    assert.equal(((await response.json()) as { code: string }).code, "SOURCE_TIMEOUT");
    assert.equal(calls.length, 1, "타임아웃 뒤 재시도하지 않는다");
  } finally {
    mock.timers.reset();
  }
});

// --- fallback 부재 ----------------------------------------------------------

test("상류가 실패해도 두 번째 fetch·다른 서버로의 우회가 없다", async () => {
  await callRoute({
    base: GOOD_BASE,
    key: FAKE_KEY,
    upstream: async () => {
      throw new TypeError("fetch failed");
    },
  });
  assert.equal(calls.length, 1, "재시도·순회 없이 정확히 1회만 호출한다");
});

test("상류 오류 응답에도 재시도하지 않는다", async () => {
  await callRoute({
    base: GOOD_BASE,
    key: FAKE_KEY,
    upstream: async () => new Response(JSON.stringify({ ok: false, code: "EXTRACTOR_BUSY" }), { status: 503 }),
  });
  assert.equal(calls.length, 1);
});

test("어떤 설정에서도 cr-check 주소로 나가지 않는다", async () => {
  const attempts = [
    { base: undefined, key: FAKE_KEY },
    { base: "", key: FAKE_KEY },
    { base: "https://extractor.example.invalid/extract", key: FAKE_KEY },
    { base: "not-a-url", key: FAKE_KEY },
  ];
  for (const attempt of attempts) {
    await callRoute(attempt);
    for (const call of calls) {
      assert.ok(!call.url.includes("cr-check"), `cr-check 로 나갔다: ${call.url}`);
      assert.ok(!call.url.includes("railway.app"), `옛 기본주소로 나갔다: ${call.url}`);
    }
  }
});

// --- 기존 계약 유지 ---------------------------------------------------------

test("설정이 정상이면 본문 방어와 오류 코드가 예전 그대로다", async () => {
  const bad: Array<[unknown, string]> = [
    [{}, "url 없음"],
    [{ url: "" }, "빈 url"],
    [{ url: "   " }, "공백 url"],
    [{ url: 123 }, "문자열 아님"],
    [[], "배열"],
  ];
  for (const [body, label] of bad) {
    const response = await callRoute({ base: GOOD_BASE, key: FAKE_KEY, body });
    assert.equal(response.status, 400, label);
    assert.equal(((await response.json()) as { code: string }).code, "INVALID_URL", label);
    assert.equal(calls.length, 0, `${label}: 상류를 호출하지 않는다`);
  }
});

test("상류 호출 방식(메서드·본문·캐시)이 예전 그대로다", async () => {
  await callRoute({ base: GOOD_BASE, key: FAKE_KEY });
  const init = calls[0].init as RequestInit & { cache?: string };
  assert.equal(init.method, "POST");
  assert.equal(JSON.parse(String(init.body)).url, ARTICLE_URL);
  assert.equal(init.cache, "no-store");
  assert.ok(init.signal, "AbortSignal 로 제한 시간을 건다");
});

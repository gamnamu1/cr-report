import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 함수 최대 실행시간. 아래 application timeout 17초보다 여유를 둔다.
export const maxDuration = 20;

const RATE_LIMIT_PER_MIN = 20;
const UPSTREAM_TIMEOUT_MS = 17_000;

// lib/supabase.ts 와 같이 모듈 최상위에서 읽는다. 둘 다 NEXT_PUBLIC_ 접두어가
// 없는 서버 전용 값이라 클라이언트 번들에 들어가지 않는다.
//
// 기본 주소(fallback)를 두지 않는다. 예전에는 EXTRACT_API_BASE 가 없으면
// cr-check 의 Railway 주소로 붙었지만, 지금은 cr-report 전용 추출 서비스만
// 호출한다. 설정이 없으면 조용히 다른 서버로 가는 대신 503 으로 닫힌다.
const EXTRACT_API_KEY = process.env.EXTRACT_API_KEY;
const EXTRACT_API_BASE = process.env.EXTRACT_API_BASE;

/**
 * 신뢰된 서버 환경변수에서 얻은 BASE 를 검사해 호출할 origin 을 정한다.
 * 쓸 수 없는 값이면 null — 호출부는 상류에 손대지 않고 503 으로 닫는다.
 *
 * 클라이언트 요청은 이 값을 고르거나 덮어쓸 수 없다. 요청 본문의 `url` 은
 * 예전과 같이 **대상 기사 주소**이지 추출 서버 주소가 아니다.
 *
 * 잘못된 값을 임의로 보정해 숨기지 않는다. 예를 들어 끝에 `/extract` 가 붙은
 * BASE 는 잘라내지 않고 거부한다 — 설정한 사람이 무엇을 넣었는지 모르는 채로
 * 동작하는 편보다, 설정이 틀렸다는 사실이 드러나는 편이 낫다. 반대로 앞뒤
 * 공백과 끝 슬래시는 값의 의미를 바꾸지 않으므로 정리한다.
 *
 * 로컬 `http://127.0.0.1:<port>` 는 개발 중 연결 시험에 필요하므로 허용한다.
 * 운영 설정의 완료 기준은 공개 HTTPS origin 이며, 그것은 배포 점검에서 본다.
 */
function resolveExtractOrigin(raw: string | undefined): string | null {
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (trimmed === "") return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null; // URL 로 해석되지 않음
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username !== "" || parsed.password !== "") return null;
  if (parsed.search !== "" || parsed.hash !== "") return null;
  // 경로는 루트만 허용한다. `/extract` 를 포함해 그 밖의 경로는 전부 거부.
  if (parsed.pathname !== "/") return null;

  // origin 에는 끝 슬래시가 없다. 아래에서 `/extract` 가 정확히 한 번 붙는다.
  return parsed.origin;
}

const EXTRACT_ORIGIN = resolveExtractOrigin(EXTRACT_API_BASE);

/** 프록시가 자체 생성하는 오류의 운영용 message. 시민 문구는 클라이언트가 code 로 만든다. */
const PROXY_MESSAGES: Record<string, string> = {
  INVALID_URL: "요청 본문의 url 이 올바르지 않습니다.",
  RATE_LIMITED: "요청 빈도 제한을 초과했습니다.",
  SOURCE_FETCH_FAILED: "추출 서버에 연결하지 못했습니다.",
  SOURCE_TIMEOUT: "추출 서버가 제한 시간 안에 응답하지 않았습니다.",
  EXTRACTOR_DISABLED: "추출 서버가 설정되어 있지 않습니다.",
};

function proxyError(status: number, code: string) {
  return NextResponse.json(
    { ok: false, code, message: PROXY_MESSAGES[code] },
    { status }
  );
}

/**
 * IP 별 최근 요청 시각.
 *
 * 인스턴스 로컬 best-effort. Vercel은 인스턴스가 여러 개일 수 있고 재시작 시
 * 초기화되므로 전역 제한이 아니다. 상류의 방어는 분당 요청 수가 아니라
 * **워커별 동시 추출 상한**(프로세스당 20, 워커 2개면 복제본 하나에서 동시
 * 예약 최대 40)이다. 둘은 다른 것을 막는다 — 상류는 한꺼번에 몰리는 작업량을,
 * 이 제한은 한 시민의 오남용을 늦춘다. 이 키 선택은 Vercel에 직접
 * 들어오는 요청을 전제로 한다 — Vercel은 클라이언트가 보낸 x-forwarded-for를
 * 플랫폼 값으로 덮어쓴다. 앞에 별도 역방향 프록시를 두면 이 가정을 재확인해야
 * 한다. (Redis·KV 등 외부 저장소는 도입하지 않는다.)
 */
const recentHits = new Map<string, number[]>();

function isRateLimited(ip: string, now: number): boolean {
  const windowStart = now - 60_000;

  // 요청을 처리하는 김에 1분 지난 항목을 함께 정리한다.
  for (const [key, times] of recentHits) {
    const kept = times.filter((t) => t > windowStart);
    if (kept.length === 0) recentHits.delete(key);
    else recentHits.set(key, kept);
  }

  const times = recentHits.get(ip) ?? [];
  if (times.length >= RATE_LIMIT_PER_MIN) return true;

  times.push(now);
  recentHits.set(ip, times);
  return false;
}

/** 로그에 남길 수 있는 최소 정보. 전체 URL·쿼리스트링은 절대 남기지 않는다. */
function domainOf(rawUrl: string): string {
  try {
    const withScheme = /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`;
    return new URL(withScheme).hostname;
  } catch {
    return "(unparsed)";
  }
}

/** 상류 본문에서 로그용 라벨만 뽑는다. 반환 본문은 건드리지 않는다. */
function labelOf(body: string, status: number): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object") {
      const o = parsed as { code?: unknown; status?: unknown };
      if (typeof o.code === "string") return o.code;
      if (typeof o.status === "string") return o.status;
    }
  } catch {
    // 비JSON 응답. 상태코드만 남긴다.
  }
  return String(status);
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  // 1. 설정 확인 — rate limit·본문 처리·상류 호출보다 **앞**에서 한다.
  //    키나 주소가 없으면 외부로 나가는 요청을 한 번도 만들지 않는다.
  //    잘못된 설정 때문에 모듈 import 단계에서 throw 하지는 않는다 — 그러면
  //    홈·리포트까지 빌드가 통째로 실패한다. 여기서 기능별 오류로 돌려준다.
  if (!EXTRACT_API_KEY || EXTRACT_API_KEY.trim() === "") {
    return proxyError(503, "EXTRACTOR_DISABLED");
  }
  if (!EXTRACT_ORIGIN) return proxyError(503, "EXTRACTOR_DISABLED");

  // 2. rate limit. 헤더가 없으면 제한을 건너뛴다(차단하지 않는다).
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim();
  if (clientIp && isRateLimited(clientIp, Date.now())) {
    return proxyError(429, "RATE_LIMITED");
  }

  // 3. body 방어. 예외 객체·원문 body 를 로그에 남기지 않는다.
  //    (스킴 보정·SSRF 검증은 상류 책임이라 여기서 하지 않는다.)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return proxyError(400, "INVALID_URL");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return proxyError(400, "INVALID_URL");
  }
  const rawUrl = (body as { url?: unknown }).url;
  if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
    return proxyError(400, "INVALID_URL");
  }

  const domain = domainOf(rawUrl.trim());

  // 4. 17초 상한을 걸고 상류 호출. 상류의 15초는 best-effort 예산이지
  //    하드 컷오프가 아니므로 이 타임아웃이 실제로 발동할 수 있다.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${EXTRACT_ORIGIN}/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CR-Extract-Key": EXTRACT_API_KEY,
      },
      body: JSON.stringify({ url: rawUrl }),
      signal: controller.signal,
      cache: "no-store",
    });

    // 5. 상태코드·본문을 그대로 전달한다. 중간에 파싱·재직렬화하지 않는다.
    const text = await upstream.text();
    console.log(
      `[api/extract] ${domain} ${labelOf(text, upstream.status)} ${
        Date.now() - startedAt
      }ms`
    );
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    // 상류에 도달하지 못했거나 제한 시간을 넘겼다.
    const timedOut = controller.signal.aborted;
    const code = timedOut ? "SOURCE_TIMEOUT" : "SOURCE_FETCH_FAILED";
    console.log(`[api/extract] ${domain} ${code} ${Date.now() - startedAt}ms`);
    return proxyError(timedOut ? 504 : 502, code);
  } finally {
    clearTimeout(timer);
  }
}

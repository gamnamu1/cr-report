import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 함수 최대 실행시간. 아래 application timeout 17초보다 여유를 둔다.
export const maxDuration = 20;

const RATE_LIMIT_PER_MIN = 20;
const UPSTREAM_TIMEOUT_MS = 17_000;
const DEFAULT_EXTRACT_API_BASE = "https://cr-check-production.up.railway.app";

// lib/supabase.ts 와 같이 모듈 최상위에서 읽는다. 둘 다 NEXT_PUBLIC_ 접두어가
// 없는 서버 전용 값이라 클라이언트 번들에 들어가지 않는다.
const EXTRACT_API_KEY = process.env.EXTRACT_API_KEY;
const EXTRACT_API_BASE =
  process.env.EXTRACT_API_BASE ?? DEFAULT_EXTRACT_API_BASE;

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
 * 초기화되므로 전역 제한이 아니다. 상류의 120회/분은 서버 전체 방어 상한이며
 * 이 제한은 한 시민의 오남용을 늦추는 용도다. 이 키 선택은 Vercel에 직접
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

  // 1. 키 미설정 — 상류를 호출하지 않고 즉시 반환한다.
  if (!EXTRACT_API_KEY) return proxyError(503, "EXTRACTOR_DISABLED");

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
    const upstream = await fetch(`${EXTRACT_API_BASE}/extract`, {
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

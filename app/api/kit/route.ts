import { NextResponse } from "next/server";

import { KIT_PREAMBLE } from "@/lib/kit/instructions";
import { KIT_POSTAMBLE } from "@/lib/kit/reference";
import { KIT_VERSION } from "@/lib/kit/version";

export const runtime = "nodejs";
// 상수 JSON 이지만 Cache-Control 을 우리가 지정한 값으로 확실히 내보내기 위해
// 매 요청 핸들러를 태운다. 캐시는 아래 헤더가 담당한다.
export const dynamic = "force-dynamic";

/**
 * 키트 전달용 엔드포인트.
 *
 * 보안 경계가 아니다 — 목적은 클라이언트 번들 분리와 유지보수성이다.
 * 그래서 인증도 rate limit 도 걸지 않는다(지시서 §3-3).
 */
export async function GET() {
  return NextResponse.json(
    {
      version: KIT_VERSION,
      preamble: KIT_PREAMBLE,
      postamble: KIT_POSTAMBLE,
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}

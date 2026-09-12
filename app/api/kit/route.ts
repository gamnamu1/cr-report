import { NextResponse } from "next/server";

import { KIT_PREAMBLE } from "@/lib/kit/instructions";
import { KIT_POSTAMBLE } from "@/lib/kit/reference";
import { KIT_VERSION } from "@/lib/kit/version";

export const runtime = "nodejs";
// 상수 JSON 이라 빌드 시점에 한 번 생성해 그대로 내보낸다. 요청마다 핸들러를
// 태우지 않는다. 공개 캐시는 아래 Cache-Control 헤더가 담당한다.
export const dynamic = "force-static";

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

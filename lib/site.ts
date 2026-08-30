/**
 * 사이트 정식 도메인(canonical origin)의 단일 진실 공급원.
 *
 * NEXT_PUBLIC_ 접두사를 쓰므로 서버 컴포넌트와 클라이언트 컴포넌트 양쪽에서
 * 읽을 수 있다. 공유 링크 생성이 클라이언트에서 일어나기 때문에 필요하다.
 */

/** 환경변수가 비어 있을 때 사용하는 정식 도메인. */
export const DEFAULT_SITE_URL = "https://cr-report.kr";

function normalizeOrigin(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    // 끝 슬래시·경로를 떼고 origin 만 남긴다.
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

/** NEXT_PUBLIC_SITE_URL 이 유효한 URL 일 때만 그 origin, 아니면 undefined. */
export const SITE_URL_FROM_ENV = normalizeOrigin(
  process.env.NEXT_PUBLIC_SITE_URL
);

/**
 * 항상 유효한 사이트 origin.
 * metadataBase · robots · sitemap · 공유 링크 생성의 기준값.
 */
export const SITE_URL = SITE_URL_FROM_ENV ?? DEFAULT_SITE_URL;

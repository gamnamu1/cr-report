interface CachedBannerProps {
  publishedAt: string;
}

function formatKoreanDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function CachedBanner({ publishedAt }: CachedBannerProps) {
  return (
    <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 text-center">
      <p className="text-xs text-gray-600 font-light">
        {formatKoreanDate(publishedAt)}에 게시된 리포트입니다.
      </p>
    </div>
  );
}

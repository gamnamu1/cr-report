import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Critical Readers",
  description: "함께 읽고, 함께 바꾸는 저널리즘. 시민이 뉴스의 품질을 직접 살피고, 비평 리포트를 만들고 검수해 공유합니다.",
  openGraph: {
    title: "Critical Readers",
    description: "함께 읽고, 함께 바꾸는 저널리즘. 시민이 뉴스의 품질을 직접 살피고, 비평 리포트를 만들고 검수해 공유합니다.",
    siteName: "Critical Readers",
    type: "website",
    locale: "ko_KR",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Critical Readers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Critical Readers",
    description: "함께 읽고, 함께 바꾸는 저널리즘. 시민이 뉴스의 품질을 직접 살피고, 비평 리포트를 만들고 검수해 공유합니다.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

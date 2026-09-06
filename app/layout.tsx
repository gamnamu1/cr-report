import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Critical Readers",
  description: "시민이 검수한 뉴스 비평 리포트를 모아 두는 열람 전용 공간",
  openGraph: {
    title: "Critical Readers",
    description: "시민이 검수한 뉴스 비평 리포트를 모아 두는 열람 전용 공간",
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
    description: "시민이 검수한 뉴스 비평 리포트를 모아 두는 열람 전용 공간",
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

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "citizen-reviewers",
  description: "시민이 검수한 뉴스 비평 리포트를 모아 두는 열람 전용 공간",
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

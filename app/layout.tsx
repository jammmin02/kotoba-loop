import { galmuri, notoSansJP, pretendard } from "@/app/fonts";
import { Providers } from "@/app/providers";
import { AppShell } from "@/components/layout/app-shell";

import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "kotoba-loop",
  description: "AI 기반 일본어 단어·한자 학습 웹 서비스",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "kotoba-loop",
  },
};

// D.2 Primary — tints the OS status bar/toolbar once installed (Android/Chrome).
export const viewport: Viewport = {
  themeColor: "#5b5fef",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${notoSansJP.variable} ${galmuri.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

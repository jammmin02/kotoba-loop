import { galmuri, notoSansJP, pretendard } from "@/app/fonts";
import { Providers } from "@/app/providers";
import { AppShell } from "@/components/layout/app-shell";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

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
  // 노치/홈 인디케이터 영역까지 그린 뒤 safe-area-inset로 콘텐츠를 비운다(하단 탭바 등).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // 인라인 스크립트가 hydration 전에 `.dark` 클래스/color-scheme을 붙이므로 경고를 끈다.
    <html
      lang="ko"
      className={`${pretendard.variable} ${notoSansJP.variable} ${galmuri.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

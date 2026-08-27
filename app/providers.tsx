"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

import { AchievementToastViewport } from "@/components/game/achievement-toast";
import { ExpToastViewport } from "@/components/game/exp-toast";
import { StreakFreezeToastViewport } from "@/components/game/streak-freeze-toast";
import { InstallPromptBanner } from "@/components/pwa/install-prompt-banner";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { Toaster } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 화면 전환/포커스마다 즉시 재요청되는 것을 막는 기본값. 실시간성이 필요한
            // 화면(대결 퀴즈 등)은 Pusher 구독으로 갱신되므로 폴링에 의존하지 않는다.
            staleTime: 30_000,
            gcTime: 5 * 60_000,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
        <ExpToastViewport />
        <AchievementToastViewport />
        <StreakFreezeToastViewport />
        <ServiceWorkerRegister />
        <InstallPromptBanner />
      </QueryClientProvider>
    </SessionProvider>
  );
}

"use client";

import { useSyncExternalStore } from "react";

import { useThemePreference } from "@/lib/hooks/use-theme-preference";
import { getSystemMediaQuery, resolveTheme, writeThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/** 상단 라이트/다크 전환 버튼. 다크는 원할 때만 켜고, 선택은 이 브라우저에 저장된다. */
export function ThemeToggle({ className }: { className?: string }) {
  const preference = useThemePreference();
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  // 마운트 전에는 SSR과 같은 값을 그려 hydration 불일치를 피한다.
  const isDark = mounted && resolveTheme(preference, getSystemMediaQuery().matches) === "dark";

  return (
    <button
      type="button"
      onClick={() => writeThemePreference(isDark ? "light" : "dark")}
      aria-pressed={isDark}
      aria-label="다크 모드"
      className={cn(
        "flex h-9 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface px-3 text-xs font-bold text-foreground shadow-bevel-raised hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
    >
      {isDark ? "라이트로" : "다크로"}
    </button>
  );
}

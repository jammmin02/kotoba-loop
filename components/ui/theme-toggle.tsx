"use client";

import { useSyncExternalStore } from "react";

import { PixelMoon, PixelSun } from "@/components/icons/pixel-icons";
import { useThemePreference } from "@/lib/hooks/use-theme-preference";
import { getSystemMediaQuery, resolveTheme, writeThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/** 라이트/다크 전환 아이콘 버튼(달). 다크는 원할 때만 켜고, 선택은 이 브라우저에 저장된다. */
export function ThemeToggle({ className }: { className?: string }) {
  const preference = useThemePreference();
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  // 마운트 전에는 SSR과 같은 값을 그려 hydration 불일치를 피한다.
  const isDark = mounted && resolveTheme(preference, getSystemMediaQuery().matches) === "dark";
  const Icon = isDark ? PixelSun : PixelMoon;

  return (
    <button
      type="button"
      onClick={() => writeThemePreference(isDark ? "light" : "dark")}
      aria-pressed={isDark}
      aria-label="다크 모드"
      title={isDark ? "라이트 모드로" : "다크 모드로"}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground shadow-bevel-raised hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}

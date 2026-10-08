"use client";

import { useThemePreference } from "@/lib/hooks/use-theme-preference";
import { THEME_PREFERENCES, writeThemePreference } from "@/lib/theme";
import type { ThemePreference } from "@/lib/theme";

import { ChipButton } from "./chip-button";

const THEME_LABELS: Record<ThemePreference, string> = {
  light: "라이트",
  dark: "다크",
  system: "시스템",
};

/** 라이트/다크/시스템 3단 테마 선택. 선택은 즉시 적용되고 이 브라우저에 저장된다. */
export function ThemeSelector() {
  const preference = useThemePreference();

  return (
    <div role="group" aria-label="화면 테마" className="flex flex-wrap gap-2">
      {THEME_PREFERENCES.map((option) => (
        <ChipButton
          key={option}
          selected={preference === option}
          onClick={() => writeThemePreference(option)}
        >
          {THEME_LABELS[option]}
        </ChipButton>
      ))}
    </div>
  );
}

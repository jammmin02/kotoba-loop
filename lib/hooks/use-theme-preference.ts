"use client";

import { useSyncExternalStore } from "react";

import {
  DEFAULT_THEME_PREFERENCE,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  readThemePreference,
} from "@/lib/theme";
import type { ThemePreference } from "@/lib/theme";

function subscribe(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    // 다른 탭에서 바꾼 선택도 반영한다(key가 null이면 저장소 전체 초기화).
    if (event.key === null || event.key === THEME_STORAGE_KEY) onChange();
  };
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

/** SSR에서는 항상 '라이트'로 시작하고, 마운트 후 저장된 선택으로 갱신한다. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readThemePreference, () => DEFAULT_THEME_PREFERENCE);
}

"use client";

import { useLayoutEffect } from "react";

import { useThemePreference } from "@/lib/hooks/use-theme-preference";
import { applyTheme, getSystemMediaQuery } from "@/lib/theme";

/**
 * 저장된 테마를 `<html>`에 다시 적용하고, '시스템' 선택일 때 OS 설정 변경을 실시간 반영한다.
 * 첫 페인트는 layout의 인라인 스크립트가 처리하지만, 개발 모드 Strict Mode 재마운트가
 * `<html>` 클래스를 지울 수 있어 여기서 한 번 더 적용한다(운영에서는 no-op).
 */
export function ThemeSync() {
  const preference = useThemePreference();

  useLayoutEffect(() => {
    applyTheme(preference);
    if (preference !== "system") return;

    const query = getSystemMediaQuery();
    const handleChange = () => applyTheme("system");
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [preference]);

  return null;
}

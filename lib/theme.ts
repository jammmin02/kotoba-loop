/**
 * 라이트/다크/시스템 테마 선택. 선택값은 localStorage에 저장하고 `<html>`에 `.dark`
 * 클래스를 붙여 적용한다(styles/globals.css의 class 전략). 첫 페인트 전 적용은
 * `THEME_INIT_SCRIPT`(app/layout.tsx의 인라인 스크립트)가, 이후 동기화는 ThemeSync가 맡는다.
 */

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "kotoba-theme";
export const THEME_CHANGE_EVENT = "kotoba-theme-change";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "light";

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function parseThemePreference(value: unknown): ThemePreference {
  return THEME_PREFERENCES.find((preference) => preference === value) ?? DEFAULT_THEME_PREFERENCE;
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

export function getSystemMediaQuery(): MediaQueryList {
  return window.matchMedia(DARK_MEDIA_QUERY);
}

export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // 저장소에 접근할 수 없으면(시크릿 모드 등) 기본값(라이트)을 쓴다.
    return DEFAULT_THEME_PREFERENCE;
  }
}

/** `<html>`에 해석된 테마를 반영한다. `color-scheme`도 맞춰 스크롤바·폼 컨트롤이 함께 바뀐다. */
export function applyTheme(preference: ThemePreference): void {
  const resolved = resolveTheme(preference, getSystemMediaQuery().matches);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function writeThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // 저장에 실패해도 이번 방문 동안은 적용된다.
  }
  applyTheme(preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/**
 * 첫 페인트 전에 실행되는 인라인 스크립트. 위 로직(parse/resolve/apply)을 의존성 없이
 * 그대로 옮긴 것이라 둘을 함께 수정해야 한다.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=null;try{p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}if(p!=="light"&&p!=="dark"&&p!=="system")p="light";var d=p==="dark"||(p==="system"&&window.matchMedia(${JSON.stringify(DARK_MEDIA_QUERY)}).matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

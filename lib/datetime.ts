/**
 * Korea does not observe daylight saving time, so KST is always a fixed
 * UTC+9 offset — safe to hardcode instead of relying on Intl/tz data.
 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Shifts a Date's UTC-based getters to read as if they were KST wall-clock values. */
function toKstShifted(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

/** Returns the UTC instant corresponding to 00:00:00 KST of the given date's KST calendar day. */
export function startOfKstDay(date: Date = new Date()): Date {
  const shifted = toKstShifted(date);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - KST_OFFSET_MS);
}

/** Adds a number of KST calendar days (can be negative). Used for spaced-repetition review scheduling. */
export function addKstDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Returns the UTC instant corresponding to 00:00:00 KST of the 1st of the given date's KST
 * calendar month. `monthOffset` shifts by whole calendar months (e.g. -1 = the previous month's
 * 1st) — used by the weekly/monthly report (PROMPT 44) to walk to past completed months.
 */
export function startOfKstMonth(date: Date = new Date(), monthOffset = 0): Date {
  const shifted = toKstShifted(date);
  shifted.setUTCDate(1);
  shifted.setUTCHours(0, 0, 0, 0);
  shifted.setUTCMonth(shifted.getUTCMonth() + monthOffset);
  return new Date(shifted.getTime() - KST_OFFSET_MS);
}

/**
 * "이번 주"의 시작 — ISO 캘린더 주가 아니라 오답노트(PROMPT 21)가 도입한 정의를 그대로 따른다:
 * 오늘을 포함한 KST 기준 최근 7일 롤링 구간. 여러 화면(오답노트, 통계)이 같은 정의를 쓰도록
 * 한 곳에 둔다.
 */
export function startOfKstRollingWeek(date: Date = new Date()): Date {
  return addKstDays(startOfKstDay(date), -6);
}

/**
 * 캘린더 주(월요일 시작)의 시작 — 위 롤링 주와는 다른 정의다. 리포트(PROMPT 44)가 "완결된
 * 주"를 배치성으로 한 번만 계산해 캐시해야 해서, 매일 움직이는 롤링 창이 아니라 월~일로
 * 고정된 캘린더 주가 필요하다.
 */
export function startOfKstCalendarWeek(date: Date = new Date()): Date {
  const startOfDay = startOfKstDay(date);
  const dayOfWeek = toKstShifted(startOfDay).getUTCDay(); // 0=일 1=월 ... 6=토
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return addKstDays(startOfDay, -daysSinceMonday);
}

/** KST 기준 "YYYY-MM-DD" 캘린더 날짜 키. 자정이 지나면 값이 바뀐다(lib/quest/engine.ts
 * getQuestDateKey, 학습 캘린더 PROMPT 54가 공유한다). */
export function toKstDateKey(date: Date): string {
  return formatKstISOString(startOfKstDay(date)).slice(0, 10);
}

/** Formats a Date as an ISO 8601 string with an explicit +09:00 (KST) offset, e.g. "2026-08-21T14:30:00+09:00". */
export function formatKstISOString(date: Date = new Date()): string {
  const shifted = toKstShifted(date);
  const pad = (n: number) => String(n).padStart(2, "0");

  const yyyy = shifted.getUTCFullYear();
  const mm = pad(shifted.getUTCMonth() + 1);
  const dd = pad(shifted.getUTCDate());
  const hh = pad(shifted.getUTCHours());
  const mi = pad(shifted.getUTCMinutes());
  const ss = pad(shifted.getUTCSeconds());

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+09:00`;
}

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

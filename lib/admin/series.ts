const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 한국 시간 기준 날짜 키(YYYY-MM-DD). 한국은 서머타임이 없어 +9시간 고정이다. */
export function kstDateKey(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * 오늘(한국 시간)로 끝나는 `days`일의 날짜 키를 오래된 순으로 만든다. 집계 쿼리는 데이터가 없는 날을
 * 건너뛰므로, 차트가 빈 날을 0으로 보여주도록 이 키 목록에 결과를 채워 넣는다.
 */
export function lastKstDays(days: number, now: Date): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    keys.push(kstDateKey(new Date(now.getTime() - i * DAY_MS)));
  }
  return keys;
}

/** 날짜별 집계 행을 날짜 키 목록에 맞춰 채우고, 없는 날은 `empty`로 채운다. */
export function fillDaily<T extends { date: string }>(
  keys: string[],
  rows: T[],
  empty: (date: string) => T,
): T[] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  return keys.map((date) => byDate.get(date) ?? empty(date));
}

/** 월요일 시작 주의 시작 날짜 키(YYYY-MM-DD) — 일별 키를 주별로 묶을 때 쓴다. */
export function weekStartKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const dayOfWeek = date.getUTCDay(); // 0=일 … 6=토
  const sinceMonday = (dayOfWeek + 6) % 7;
  return new Date(date.getTime() - sinceMonday * DAY_MS).toISOString().slice(0, 10);
}

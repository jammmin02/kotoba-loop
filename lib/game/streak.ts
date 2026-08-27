import { addKstDays } from "@/lib/datetime";

/**
 * Pure 스트릭 전이 함수(lib/game/engine.ts와 같은 패턴). No I/O — DB 조회/락은
 * lib/game/grant.ts가 담당한다.
 */

export interface StreakWriteState {
  currentStreak: number;
  longestStreak: number;
  lastStudiedDate: Date | null;
}

export interface StreakWriteResult {
  currentStreak: number;
  longestStreak: number;
  /** 이번 호출이 스트릭 프리즈를 소비해 리셋을 막았는지(PROMPT 27.5). true면 호출부가
   * `streak_freeze_count`를 1 줄이고 `StreakFreezeLog`에 건너뛴 날을 기록해야 한다. */
  freezeConsumed: boolean;
}

/**
 * "오늘의 학습 완료" 보너스가 지급되는 순간(하루 1회, `maybeGrantDailyCompletionBonus`)에만
 * 호출한다. 어제까지 이어져 있었으면 +1. 정확히 하루만 건너뛰었고(그제까지 학습 → 어제
 * 미학습 → 오늘 완료) 스트릭 프리즈가 1개 이상 있으면, 리셋 대신 자동 소비하여 이어서 +1
 * 시킨다(PROMPT 27.5 — 이틀 이상 건너뛴 경우는 프리즈가 있어도 보호하지 않는다). 그 외(첫
 * 학습이거나 이틀 이상 건너뛴 경우)는 오늘을 1일차로 다시 시작한다.
 */
export function applyStreakUpdate(
  state: StreakWriteState,
  today: Date,
  streakFreezeCount: number = 0,
): StreakWriteResult {
  const yesterday = addKstDays(today, -1);
  const dayBeforeYesterday = addKstDays(today, -2);
  const continuesStreak = state.lastStudiedDate?.getTime() === yesterday.getTime();
  const skippedExactlyOneDay = state.lastStudiedDate?.getTime() === dayBeforeYesterday.getTime();
  const freezeConsumed = !continuesStreak && skippedExactlyOneDay && streakFreezeCount > 0;

  const currentStreak = continuesStreak || freezeConsumed ? state.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    freezeConsumed,
  };
}

/**
 * 조회 시점 계산(lazy) — 마지막 학습일이 어제보다 이전이면, 아직 오늘의 학습 완료 실패가
 * DB에 반영되지 않았어도 이미 끊긴 것으로 표시한다. 별도 자정 배치 없이 이 함수만으로
 * "하루라도 미학습 시 초기화"가 조회 시점에 항상 정확하다 — 다음 완료 보너스 지급 때
 * `applyStreakUpdate`가 실제로 1로 리셋해 DB에도 반영한다.
 */
export function getDisplayStreak(
  currentStreak: number,
  lastStudiedDate: Date | null,
  today: Date,
): number {
  if (!lastStudiedDate) return 0;
  const yesterday = addKstDays(today, -1);
  const isAlive =
    lastStudiedDate.getTime() === today.getTime() ||
    lastStudiedDate.getTime() === yesterday.getTime();
  return isAlive ? currentStreak : 0;
}

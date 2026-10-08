/**
 * 하루 학습량 상한(신규 단어 수 + 복습 수)의 순수 계산. DB 조회는 `queries.ts`가 하고, 여기서는
 * "오늘 이미 한 만큼"을 빼서 남은 몫을 정하는 규칙만 다룬다 — 오답 복습(WEAK)은 상한 대상이 아니다.
 */

export interface DailyAllowanceInput {
  /** 하루 신규 단어 목표(`daily_word_target` 또는 "오늘만" 적용한 추천값). */
  newTarget: number;
  /** 하루 복습 상한. null이면 제한 없음. */
  reviewLimit: number | null;
  /** 오늘 처음 학습을 시작한 단어 수(신규에서 벗어난 단어). */
  newIntroducedToday: number;
  /** 오늘 이미 복습한 단어 수(오늘 이전에도 학습 기록이 있는 단어). */
  reviewedToday: number;
}

export interface DailyAllowance {
  newRemaining: number;
  /** null이면 복습 수에 제한이 없다. */
  reviewRemaining: number | null;
}

export function computeDailyAllowance(input: DailyAllowanceInput): DailyAllowance {
  return {
    newRemaining: Math.max(0, input.newTarget - input.newIntroducedToday),
    reviewRemaining:
      input.reviewLimit === null ? null : Math.max(0, input.reviewLimit - input.reviewedToday),
  };
}

/** 앞에서부터 `remaining`개만 남긴다(null이면 전부). 큐는 이미 우선순위 순으로 정렬돼 있다. */
export function takeWithinAllowance<T>(items: T[], remaining: number | null): T[] {
  return remaining === null ? items : items.slice(0, remaining);
}

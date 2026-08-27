import { toKstDateKey } from "@/lib/datetime";
import { QUEST_CODES } from "@/lib/quest/constants";

/**
 * Pure Daily Quest 전이 함수(lib/game/engine.ts와 같은 패턴). No I/O — DB 조회/락은
 * lib/quest/service.ts가 담당한다.
 */

/** KST 기준 "YYYY-MM-DD". 자정이 지나면 값이 바뀌므로, 이 값을 date_or_week_key로 쓰는 것
 * 자체가 매일 자정 초기화 역할을 한다(새 키에는 아직 행이 없어 0부터 시작한다). */
export function getQuestDateKey(now: Date): string {
  return toKstDateKey(now);
}

/** NEW_WORD_STUDY만 그날그날의 사용자 목표(daily_word_target)를 따르고, 나머지는 시딩된
 * 고정값을 그대로 쓴다. */
export function resolveQuestTarget(
  code: string,
  storedTargetCount: number,
  dailyWordTarget: number,
): number {
  return code === QUEST_CODES.NEW_WORD_STUDY ? dailyWordTarget : storedTargetCount;
}

export function formatQuestTitle(titleTemplate: string, target: number): string {
  return titleTemplate.replace("{count}", String(target));
}

export interface QuestProgressState {
  currentCount: number;
  isCompleted: boolean;
}

export interface QuestIncrementResult extends QuestProgressState {
  justCompleted: boolean;
}

/** 이미 완료된 퀘스트는 더 증가시키지 않는다(중복 완료/중복 EXP 지급 방지). 목표치를 넘는
 * 증가분은 잘라낸다. */
export function applyQuestIncrement(
  state: QuestProgressState,
  target: number,
  amount: number,
): QuestIncrementResult {
  if (state.isCompleted || amount <= 0) {
    return { ...state, justCompleted: false };
  }
  const currentCount = Math.min(state.currentCount + amount, target);
  const isCompleted = currentCount >= target;
  return { currentCount, isCompleted, justCompleted: isCompleted };
}

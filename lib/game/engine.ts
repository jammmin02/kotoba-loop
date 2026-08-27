import { EXP_PER_LEVEL_MULTIPLIER } from "@/lib/game/constants";
import type { ExpGainResult, GameProfileState } from "@/lib/game/types";

/**
 * Pure EXP/레벨 전이 함수(계획서 확정값 `필요 EXP(레벨 n→n+1) = 50 × n`, 누적 합산). No I/O —
 * `lib/srs/engine.ts`와 같은 패턴이다.
 */
export function requiredExpForLevel(level: number): number {
  return EXP_PER_LEVEL_MULTIPLIER * level;
}

/** 레벨업 시 초과분 EXP는 다음 레벨로 이월된다. 한 번에 여러 레벨을 넘는 경우까지 정확히 처리한다. */
export function applyExpGain(state: GameProfileState, amount: number): ExpGainResult {
  let level = state.level;
  let exp = state.exp + amount;
  let leveledUp = false;

  while (exp >= requiredExpForLevel(level)) {
    exp -= requiredExpForLevel(level);
    level += 1;
    leveledUp = true;
  }

  return { level, exp, leveledUp };
}

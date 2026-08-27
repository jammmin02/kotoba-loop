import { PET_GROWTH_THRESHOLDS } from "@/lib/pet/constants";
import type { PetStage } from "@/lib/pet/types";

export interface PetStageResult {
  stage: PetStage;
  isGraduated: boolean;
}

/**
 * Pure 성장 단계 계산(No I/O — lib/game/engine.ts와 같은 패턴). `levelsSinceStart`는 현재
 * UserGameProfile.level - UserPet.level_at_start다. 한 번에 여러 레벨을 건너뛰어도(예: 퀘스트
 * 전체 완료 보너스가 겹쳐 +15) 임계값을 내림차순으로 순회해 정확한 최종 단계를 바로 계산한다.
 */
export function computeStageForLevels(levelsSinceStart: number): PetStageResult {
  if (levelsSinceStart >= PET_GROWTH_THRESHOLDS.graduate) {
    return { stage: "adult", isGraduated: true };
  }
  if (levelsSinceStart >= PET_GROWTH_THRESHOLDS.adult) {
    return { stage: "adult", isGraduated: false };
  }
  if (levelsSinceStart >= PET_GROWTH_THRESHOLDS.teen) {
    return { stage: "teen", isGraduated: false };
  }
  if (levelsSinceStart >= PET_GROWTH_THRESHOLDS.child) {
    return { stage: "child", isGraduated: false };
  }
  if (levelsSinceStart >= PET_GROWTH_THRESHOLDS.baby) {
    return { stage: "baby", isGraduated: false };
  }
  return { stage: "egg", isGraduated: false };
}

/** 다음 단계(또는 졸업)까지 남은 "선택 이후 레벨 상승분" — 위젯 진행 안내용. 이미 졸업 조건을 채웠으면 0. */
export function levelsUntilNextThreshold(levelsSinceStart: number): number {
  const nextThreshold = Object.values(PET_GROWTH_THRESHOLDS).find(
    (threshold) => threshold > levelsSinceStart,
  );
  return nextThreshold === undefined ? 0 : nextThreshold - levelsSinceStart;
}

export interface PetStageProgress {
  /** 현재 단계 구간 안에서 이미 채운 레벨 상승분. */
  current: number;
  /** 현재 단계 구간의 전체 폭(다음 단계까지 필요한 총 레벨 상승분). */
  total: number;
}

const STAGE_BOUNDARIES = [
  0,
  PET_GROWTH_THRESHOLDS.baby,
  PET_GROWTH_THRESHOLDS.child,
  PET_GROWTH_THRESHOLDS.teen,
  PET_GROWTH_THRESHOLDS.adult,
  PET_GROWTH_THRESHOLDS.graduate,
] as const;

/**
 * "다음 단계까지 N레벨" 텍스트로는 지금 단계에서 얼마나 왔는지 알 수 없어, 진행률 바(EXP Bar와
 * 같은 형태, components/game/exp-bar.tsx)에 쓸 current/total 구간을 계산한다. 졸업 조건까지
 * 채운 뒤에는 마지막 구간(teen→adult)을 가득 채운 상태로 고정해 보여준다.
 */
export function getStageProgress(levelsSinceStart: number): PetStageProgress {
  for (let i = 0; i < STAGE_BOUNDARIES.length - 1; i++) {
    const [start, end] = [STAGE_BOUNDARIES[i], STAGE_BOUNDARIES[i + 1]];
    if (levelsSinceStart < end) {
      return { current: levelsSinceStart - start, total: end - start };
    }
  }
  const total =
    STAGE_BOUNDARIES[STAGE_BOUNDARIES.length - 1] - STAGE_BOUNDARIES[STAGE_BOUNDARIES.length - 2];
  return { current: total, total };
}

import type { PetSpecies, PetStage } from "@/lib/pet/types";

export const PET_SPECIES = ["cat", "dinosaur", "rabbit"] as const satisfies readonly PetSpecies[];

export const PET_STAGE_ORDER = [
  "egg",
  "baby",
  "child",
  "teen",
  "adult",
] as const satisfies readonly PetStage[];

export const PET_SPECIES_OPTIONS: { value: PetSpecies; label: string; colorToken: string }[] = [
  { value: "cat", label: "고양이", colorToken: "primary" },
  { value: "dinosaur", label: "공룡", colorToken: "secondary" },
  { value: "rabbit", label: "토끼", colorToken: "accent" },
];

export const PET_STAGE_LABELS: Record<PetStage, string> = {
  egg: "알",
  baby: "아기",
  child: "어린이",
  teen: "청소년",
  adult: "성체",
};

/**
 * 성장 임계값 — "선택 이후 레벨 상승분"(lib/pet/engine.ts computeStageForLevels의 입력) 기준.
 * 계획서 스펙의 기본값이며, Phase 7 Level 곡선과 함께 실사용해보며 수치만 조정될 수 있다.
 * graduate에 도달하면 adult 단계를 유지한 채 졸업(is_graduated=true, is_active=false)한다.
 */
export const PET_GROWTH_THRESHOLDS = {
  baby: 1,
  child: 5,
  teen: 12,
  adult: 20,
  graduate: 30,
} as const;

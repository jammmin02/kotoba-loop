import { getStageProgress, levelsUntilNextThreshold } from "@/lib/pet/engine";
import type { ActivePetRow } from "@/lib/pet/service";
import type { UserPetView } from "@/types/pet";

/** `ActivePetRow` + 계정 레벨 → API 응답용 뷰. app/api/pet, app/api/admin/pet/* 라우트 공용. */
export function toPetView(pet: ActivePetRow, currentLevel: number): UserPetView {
  const levelsSinceStart = currentLevel - pet.level_at_start;
  const stageProgress = getStageProgress(levelsSinceStart);
  return {
    id: pet.id,
    species: pet.species,
    stage: pet.stage,
    levelsSinceStart,
    levelsUntilNextStage: levelsUntilNextThreshold(levelsSinceStart),
    stageProgressCurrent: stageProgress.current,
    stageProgressTotal: stageProgress.total,
    startedAt: pet.started_at.toISOString(),
  };
}

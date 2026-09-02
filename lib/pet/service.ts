import "server-only";

import { ApiError } from "@/lib/api/error";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { computeStageForLevels } from "@/lib/pet/engine";
import type { PetSpecies, PetStage } from "@/lib/pet/types";

export interface ActivePetRow {
  id: string;
  species: PetSpecies;
  stage: PetStage;
  level_at_start: number;
  started_at: Date;
}

export interface PetHistoryRow extends ActivePetRow {
  is_active: boolean;
  is_graduated: boolean;
  graduated_at: Date | null;
}

export interface PetGrowthResult {
  petId: string;
  species: PetSpecies;
  newStage: PetStage;
  justGraduated: boolean;
}

export async function getActivePet(
  client: typeof db | Prisma.TransactionClient,
  userId: string,
): Promise<ActivePetRow | null> {
  return client.userPet.findFirst({
    where: { user_id: userId, is_active: true },
    select: { id: true, species: true, stage: true, level_at_start: true, started_at: true },
  });
}

/**
 * 새 펫을 시작한다. "활성 펫 1개" 불변식은 UserExamGoal의 is_active와 같은 이유로 DB 제약이
 * 아니라 여기서 트랜잭션으로 강제한다(이 코드베이스에 별도 CONFLICT 에러 코드가 없어
 * VALIDATION_ERROR를 재사용 — 실제로는 위젯이 활성 펫이 있을 때 선택 패널 자체를 숨기므로,
 * 이 분기는 동시 요청/직접 API 호출 같은 방어적 상황에서만 걸린다).
 */
export async function selectNewPet(
  tx: Prisma.TransactionClient,
  userId: string,
  species: PetSpecies,
  currentLevel: number,
): Promise<ActivePetRow> {
  const existing = await tx.userPet.findFirst({ where: { user_id: userId, is_active: true } });
  if (existing) {
    throw new ApiError("VALIDATION_ERROR", "이미 키우고 있는 펫이 있습니다.");
  }

  return tx.userPet.create({
    data: { user_id: userId, species, level_at_start: currentLevel },
    select: { id: true, species: true, stage: true, level_at_start: true, started_at: true },
  });
}

/**
 * 레벨업마다 grantActionExp(lib/game/grant.ts)가 호출한다. 활성 펫 행을 FOR UPDATE로 잠근다
 * — UserGameProfile용 잠금(lib/game/exp.ts)과는 별개 테이블이라 동시 요청 간 레이스를 막으려면
 * 이 테이블도 자체적으로 잠가야 한다(incrementQuestProgress와 동일한 이유).
 * 단계 변화도 졸업도 없으면 null을 반환해 호출부가 토스트/glow를 트리거하지 않게 한다.
 */
export async function syncPetGrowth(
  tx: Prisma.TransactionClient,
  userId: string,
  newLevel: number,
): Promise<PetGrowthResult | null> {
  const rows = await tx.$queryRaw<
    { id: string; species: PetSpecies; stage: PetStage; level_at_start: number }[]
  >`
    SELECT id, species, stage, level_at_start FROM "UserPet"
    WHERE user_id = ${userId} AND is_active = true
    FOR UPDATE
  `;
  const pet = rows[0];
  if (!pet) return null;

  const levelsSinceStart = newLevel - pet.level_at_start;
  const { stage: newStage, isGraduated } = computeStageForLevels(levelsSinceStart);

  if (newStage === pet.stage && !isGraduated) return null;

  await tx.userPet.update({
    where: { id: pet.id },
    data: {
      stage: newStage,
      ...(isGraduated ? { is_graduated: true, is_active: false, graduated_at: new Date() } : {}),
    },
  });

  return { petId: pet.id, species: pet.species, newStage, justGraduated: isGraduated };
}

export interface AdminPetLevelResult {
  pet: ActivePetRow;
  /** 이 조작 시점의 UserGameProfile.level — 호출부가 다시 조회하지 않고 뷰를 만들 수 있게. */
  currentLevel: number;
  growth: PetGrowthResult | null;
}

/**
 * 관리자 전용 풀테스트 도구(2026-09-02 신설) — 실제 학습 없이 펫 성장 단계를 ±1칸 오간다.
 * `UserGameProfile.level`(계정 전체 레벨)은 건드리지 않고, 이 펫의 `level_at_start`만 반대
 * 방향으로 옮겨 `levelsSinceStart = currentLevel - level_at_start`를 ±1 시뮬레이션한다 — 그래서
 * 다른 게임화 요소(퀘스트/업적/EXP)에는 아무 영향이 없다. 하한은 egg(levelsSinceStart=0)에서
 * 막힌다. 졸업 임계값을 넘겨 레벨업하면 실제 성장과 동일하게 자동 졸업 처리한다(is_graduated=true,
 * is_active=false) — 이후 되돌리는 기능은 없고(추가 결정 필요 시 재검토), 관리자는 "펫 변경"으로
 * 곧바로 새 펫을 다시 시작하면 된다.
 */
export async function adminAdjustPetStage(
  tx: Prisma.TransactionClient,
  userId: string,
  direction: 1 | -1,
): Promise<AdminPetLevelResult> {
  const rows = await tx.$queryRaw<
    { id: string; species: PetSpecies; stage: PetStage; level_at_start: number; started_at: Date }[]
  >`
    SELECT id, species, stage, level_at_start, started_at FROM "UserPet"
    WHERE user_id = ${userId} AND is_active = true
    FOR UPDATE
  `;
  const pet = rows[0];
  if (!pet) {
    throw new ApiError("NOT_FOUND", "테스트할 활성 펫이 없습니다. 먼저 펫을 선택하세요.");
  }

  const gameProfile = await tx.userGameProfile.upsert({
    where: { user_id: userId },
    update: {},
    create: { user_id: userId },
    select: { level: true },
  });

  const currentLevelsSinceStart = gameProfile.level - pet.level_at_start;
  const nextLevelsSinceStart = Math.max(0, currentLevelsSinceStart + direction);
  const nextLevelAtStart = gameProfile.level - nextLevelsSinceStart;
  const { stage: newStage, isGraduated } = computeStageForLevels(nextLevelsSinceStart);

  await tx.userPet.update({
    where: { id: pet.id },
    data: {
      level_at_start: nextLevelAtStart,
      stage: newStage,
      ...(isGraduated ? { is_graduated: true, is_active: false, graduated_at: new Date() } : {}),
    },
  });

  const growth: PetGrowthResult | null =
    newStage === pet.stage && !isGraduated
      ? null
      : { petId: pet.id, species: pet.species, newStage, justGraduated: isGraduated };

  return {
    pet: { ...pet, level_at_start: nextLevelAtStart, stage: newStage },
    currentLevel: gameProfile.level,
    growth,
  };
}

/**
 * 관리자 전용 풀테스트 도구 — 일반 유저와 달리 활성 펫이 있어도(졸업 여부 무관) 즉시 다른 종으로
 * 바꿀 수 있다. 기존 펫은 삭제하지 않고 `is_active=false`로 이력에 남긴다(PetHistoryView에 계속
 * 노출됨) — 다만 실제로 다 자라 졸업한 게 아니므로 `is_graduated`는 건드리지 않아(졸업 배지 오표시
 * 방지) 있는 그대로 둔다.
 */
export async function adminForceSelectPet(
  tx: Prisma.TransactionClient,
  userId: string,
  species: PetSpecies,
  currentLevel: number,
): Promise<ActivePetRow> {
  await tx.userPet.updateMany({
    where: { user_id: userId, is_active: true },
    data: { is_active: false },
  });

  return tx.userPet.create({
    data: { user_id: userId, species, level_at_start: currentLevel },
    select: { id: true, species: true, stage: true, level_at_start: true, started_at: true },
  });
}

export async function listPetHistory(client: typeof db, userId: string): Promise<PetHistoryRow[]> {
  return client.userPet.findMany({
    where: { user_id: userId },
    orderBy: { started_at: "desc" },
    select: {
      id: true,
      species: true,
      stage: true,
      level_at_start: true,
      started_at: true,
      is_active: true,
      is_graduated: true,
      graduated_at: true,
    },
  });
}

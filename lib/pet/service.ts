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

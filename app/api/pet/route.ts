import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStageProgress, levelsUntilNextThreshold } from "@/lib/pet/engine";
import { getActivePet, selectNewPet } from "@/lib/pet/service";
import type { ActivePetRow } from "@/lib/pet/service";
import { petSelectSchema } from "@/lib/validations/pet";
import type { PetActiveResponse, UserPetView } from "@/types/pet";

import type { NextRequest } from "next/server";

function toPetView(pet: ActivePetRow, currentLevel: number): UserPetView {
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

export const GET = withApiHandler(async (): Promise<PetActiveResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }
  const userId = session.user.id;

  const [pet, gameProfile] = await Promise.all([
    getActivePet(db, userId),
    db.userGameProfile.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId },
      select: { level: true },
    }),
  ]);

  return { pet: pet ? toPetView(pet, gameProfile.level) : null };
});

export const POST = withApiHandler(async (req: NextRequest): Promise<PetActiveResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }
  const userId = session.user.id;

  const { species } = petSelectSchema.parse(await req.json());

  const pet = await db.$transaction(async (tx) => {
    const gameProfile = await tx.userGameProfile.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId },
      select: { level: true },
    });
    return selectNewPet(tx, userId, species, gameProfile.level);
  });

  return { pet: toPetView(pet, pet.level_at_start) };
});

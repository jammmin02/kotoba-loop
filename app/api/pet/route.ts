import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActivePet, selectNewPet } from "@/lib/pet/service";
import { toPetView } from "@/lib/pet/view";
import { petSelectSchema } from "@/lib/validations/pet";
import type { PetActiveResponse } from "@/types/pet";

import type { NextRequest } from "next/server";

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

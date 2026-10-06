import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { adminForceSelectPet } from "@/lib/pet/service";
import { toPetView } from "@/lib/pet/view";
import { petSelectSchema } from "@/lib/validations/pet";
import type { AdminPetLevelResponse } from "@/types/pet";

import type { NextRequest } from "next/server";

/**
 * 관리자 전용 풀테스트 도구 — 일반 유저와 달리 활성 펫이 있어도(졸업 여부 무관) 즉시 다른 종으로
 * 바꿀 수 있다(app/api/pet POST의 selectNewPet은 이미 활성 펫이 있으면 거부함).
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<AdminPetLevelResponse> => {
  const { id: userId } = await requireAdmin();

  const { species } = petSelectSchema.parse(await req.json());

  const pet = await db.$transaction(async (tx) => {
    const gameProfile = await tx.userGameProfile.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId },
      select: { level: true },
    });
    return adminForceSelectPet(tx, userId, species, gameProfile.level);
  });

  return { pet: toPetView(pet, pet.level_at_start), growth: null };
});

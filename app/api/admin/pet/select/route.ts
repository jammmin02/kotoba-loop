import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/auth-admin";
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
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }
  if (!isAdminEmail(session.user.email)) {
    throw new ApiError("FORBIDDEN", "관리자만 사용할 수 있는 기능입니다.");
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
    return adminForceSelectPet(tx, userId, species, gameProfile.level);
  });

  return { pet: toPetView(pet, pet.level_at_start), growth: null };
});

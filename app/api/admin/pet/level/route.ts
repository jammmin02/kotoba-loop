import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { adminAdjustPetStage } from "@/lib/pet/service";
import { toPetView } from "@/lib/pet/view";
import { petAdminLevelSchema } from "@/lib/validations/pet";
import type { AdminPetLevelResponse } from "@/types/pet";

import type { NextRequest } from "next/server";

/**
 * 관리자 전용 풀테스트 도구(2026-09-02 신설, 사용자 요청) — admin 계정이 실제 학습 없이
 * 펫 성장을 ±1칸씩 오갈 수 있게 한다. 계정 전체 UserGameProfile.level은 건드리지 않는다
 * (lib/pet/service.ts adminAdjustPetStage 주석 참고) — 이 펫만의 시뮬레이션.
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<AdminPetLevelResponse> => {
  const { id: userId } = await requireAdmin();

  const { direction } = petAdminLevelSchema.parse(await req.json());

  const { pet, currentLevel, growth } = await db.$transaction((tx) =>
    adminAdjustPetStage(tx, userId, direction),
  );

  return { pet: toPetView(pet, currentLevel), growth };
});

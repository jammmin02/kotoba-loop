import { sanctionMember } from "@/lib/admin/moderation";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { adminSanctionSchema } from "@/lib/validations/admin";

import type { NextRequest } from "next/server";

/** 회원 상세에서 직접 경고·작성 제한을 적용하거나 작성 제한을 해제한다(정지는 /members/review). */
export const POST = withApiHandler(async (req: NextRequest): Promise<{ ok: true }> => {
  const admin = await requireAdmin();
  const { userId, action, reason } = adminSanctionSchema.parse(await req.json());
  await sanctionMember({ adminId: admin.id, userId, action, reason });
  return { ok: true };
});

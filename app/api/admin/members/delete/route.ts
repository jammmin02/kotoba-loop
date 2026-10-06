import { setMemberDeleted } from "@/lib/admin/members";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { adminMemberDeleteSchema } from "@/lib/validations/admin";

import type { NextRequest } from "next/server";

export const POST = withApiHandler(async (req: NextRequest): Promise<{ ok: true }> => {
  const admin = await requireAdmin();
  const { userId, action, reason } = adminMemberDeleteSchema.parse(await req.json());
  await setMemberDeleted({ adminId: admin.id, userId, action, reason });
  return { ok: true };
});

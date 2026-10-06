import { moderateBook } from "@/lib/admin/moderation";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { adminContentActionSchema } from "@/lib/validations/admin";

import type { NextRequest } from "next/server";

export const POST = withApiHandler(async (req: NextRequest): Promise<{ ok: true }> => {
  const admin = await requireAdmin();
  const { bookId, action, reason } = adminContentActionSchema.parse(await req.json());
  await moderateBook({ adminId: admin.id, bookId, action, reason });
  return { ok: true };
});

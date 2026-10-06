import { reviewMembers } from "@/lib/admin/members";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { adminReviewSchema } from "@/lib/validations/admin";
import type { AdminReviewResult } from "@/types/admin";

import type { NextRequest } from "next/server";

export const POST = withApiHandler(async (req: NextRequest): Promise<AdminReviewResult> => {
  const admin = await requireAdmin();
  const { userIds, action, reason } = adminReviewSchema.parse(await req.json());

  return reviewMembers({ adminId: admin.id, userIds, action, reason });
});

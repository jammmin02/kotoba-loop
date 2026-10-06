import { resolveReports } from "@/lib/admin/moderation";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { adminResolveReportSchema } from "@/lib/validations/admin";

import type { NextRequest } from "next/server";

export const POST = withApiHandler(async (req: NextRequest): Promise<{ closed: number }> => {
  const admin = await requireAdmin();
  const input = adminResolveReportSchema.parse(await req.json());
  return resolveReports(admin.id, input);
});

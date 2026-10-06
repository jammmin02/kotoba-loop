import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { ADMIN_PAGE_SIZE, adminAuditQuerySchema } from "@/lib/validations/admin";
import type { AdminAuditList } from "@/types/admin";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(async (req: NextRequest): Promise<AdminAuditList> => {
  await requireAdmin();
  const { page } = adminAuditQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  const [logs, total] = await Promise.all([
    db.adminAuditLog.findMany({
      orderBy: { created_at: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { admin: { select: { nickname: true } } },
    }),
    db.adminAuditLog.count(),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      reason: l.reason,
      targetUserEmail: l.target_user_email,
      adminNickname: l.admin?.nickname ?? null,
      createdAt: l.created_at.toISOString(),
    })),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
});

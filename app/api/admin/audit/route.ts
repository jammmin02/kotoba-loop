import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import type { AdminAuditAction } from "@/lib/generated/prisma/client";
import { ADMIN_PAGE_SIZE, adminAuditQuerySchema } from "@/lib/validations/admin";
import type { AdminAuditList } from "@/types/admin";

import type { NextRequest } from "next/server";

const GROUP_ACTIONS: Record<string, AdminAuditAction[] | undefined> = {
  member: ["APPROVE", "REJECT", "SUSPEND", "RESTORE"],
  content: ["HIDE_CONTENT", "RESTORE_CONTENT", "DELETE_CONTENT"],
  sanction: ["WARN", "RESTRICT_WRITE"],
  report: ["RESOLVE_REPORT", "DISMISS_REPORT"],
};

export const GET = withApiHandler(async (req: NextRequest): Promise<AdminAuditList> => {
  await requireAdmin();
  const { group, page } = adminAuditQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const actions = GROUP_ACTIONS[group];
  const where = actions ? { action: { in: actions } } : {};

  const [logs, total] = await Promise.all([
    db.adminAuditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { admin: { select: { nickname: true } } },
    }),
    db.adminAuditLog.count({ where }),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      reason: l.reason,
      targetUserEmail: l.target_user_email,
      targetLabel: l.target_label,
      adminNickname: l.admin?.nickname ?? null,
      createdAt: l.created_at.toISOString(),
    })),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
});

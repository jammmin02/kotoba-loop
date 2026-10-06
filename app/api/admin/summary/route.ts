import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import type { AdminSummary, AdminUserStatus } from "@/types/admin";

export const GET = withApiHandler(async (): Promise<AdminSummary> => {
  await requireAdmin();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [grouped, signupsToday] = await Promise.all([
    db.user.groupBy({ by: ["status"], _count: { _all: true }, where: { role: "USER" } }),
    db.user.count({ where: { role: "USER", created_at: { gte: startOfToday } } }),
  ]);

  const counts: Record<AdminUserStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    SUSPENDED: 0,
  };
  for (const row of grouped) counts[row.status] = row._count._all;

  return { counts, signupsToday };
});

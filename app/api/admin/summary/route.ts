import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import type { AdminSummary, AdminUserStatus } from "@/types/admin";

export const GET = withApiHandler(async (): Promise<AdminSummary> => {
  await requireAdmin();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [grouped, signupsToday, openReportGroups] = await Promise.all([
    db.user.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { role: "USER", deleted_at: null },
    }),
    db.user.count({
      where: { role: "USER", deleted_at: null, created_at: { gte: startOfToday } },
    }),
    db.report
      .groupBy({ by: ["target_type", "target_id"], where: { status: "OPEN" } })
      .then((groups) => groups.length),
  ]);

  const counts: Record<AdminUserStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    SUSPENDED: 0,
  };
  for (const row of grouped) counts[row.status] = row._count._all;

  return { counts, signupsToday, openReportGroups };
});

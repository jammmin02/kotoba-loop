import { fillDaily, lastKstDays } from "@/lib/admin/series";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import type { AdminAiUsage } from "@/types/admin";

const DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

interface DailyRow {
  date: string;
  calls: bigint;
  input_tokens: bigint;
  output_tokens: bigint;
}

export const GET = withApiHandler(async (): Promise<AdminAiUsage> => {
  await requireAdmin();

  const now = new Date();
  const since = new Date(now.getTime() - (DAYS + 1) * DAY_MS);

  const [dailyRows, byFeature, byUser] = await Promise.all([
    db.$queryRaw<DailyRow[]>`
      SELECT to_char((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS date,
             COUNT(*) AS calls,
             COALESCE(SUM(input_tokens), 0) AS input_tokens,
             COALESCE(SUM(output_tokens), 0) AS output_tokens
      FROM "AiUsageLog"
      WHERE created_at >= ${since}
      GROUP BY 1`,
    db.aiUsageLog.groupBy({
      by: ["feature"],
      where: { created_at: { gte: since } },
      _count: { _all: true },
      _sum: { input_tokens: true, output_tokens: true },
      orderBy: { _count: { feature: "desc" } },
    }),
    db.aiUsageLog.groupBy({
      by: ["user_id"],
      where: { created_at: { gte: since }, user_id: { not: null } },
      _count: { _all: true },
      _sum: { input_tokens: true, output_tokens: true },
      orderBy: { _count: { user_id: "desc" } },
      take: 10,
    }),
  ]);

  const userIds = byUser.map((u) => u.user_id).filter((id): id is string => id !== null);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nickname: true, email: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const daily = fillDaily(
    lastKstDays(DAYS, now),
    dailyRows.map((r) => ({
      date: r.date,
      calls: Number(r.calls),
      inputTokens: Number(r.input_tokens),
      outputTokens: Number(r.output_tokens),
    })),
    (date) => ({ date, calls: 0, inputTokens: 0, outputTokens: 0 }),
  );

  return {
    days: DAYS,
    totals: {
      calls: daily.reduce((sum, d) => sum + d.calls, 0),
      inputTokens: daily.reduce((sum, d) => sum + d.inputTokens, 0),
      outputTokens: daily.reduce((sum, d) => sum + d.outputTokens, 0),
    },
    daily,
    byFeature: byFeature.map((f) => ({
      feature: f.feature,
      calls: f._count._all,
      inputTokens: f._sum.input_tokens ?? 0,
      outputTokens: f._sum.output_tokens ?? 0,
    })),
    topUsers: byUser.map((u) => {
      const user = u.user_id ? userById.get(u.user_id) : undefined;
      return {
        userId: u.user_id ?? "",
        nickname: user?.nickname ?? "(알 수 없음)",
        email: user?.email ?? "",
        calls: u._count._all,
        inputTokens: u._sum.input_tokens ?? 0,
        outputTokens: u._sum.output_tokens ?? 0,
      };
    }),
  };
});

import { fillDaily, lastKstDays, weekStartKey } from "@/lib/admin/series";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import type { AdminStats } from "@/types/admin";

const DAILY_DAYS = 30;
const WEEKS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

interface DayCountRow {
  date: string;
  count: bigint;
}

// created_at/reviewed_at은 UTC로 저장된 timestamp(타임존 없음)라 UTC로 해석한 뒤 한국 시간으로 바꿔 날짜를 자른다.
const KST_DAY = `to_char((%COL% AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')`;

export const GET = withApiHandler(async (): Promise<AdminStats> => {
  await requireAdmin();

  const now = new Date();
  // 주별 추이는 12주(84일)치 일별 가입 수로 만들고, 일별 차트는 그중 최근 30일만 쓴다.
  const weekDays = lastKstDays(WEEKS * 7, now);
  const dailyKeys = lastKstDays(DAILY_DAYS, now);
  const since = new Date(now.getTime() - (WEEKS * 7 + 1) * DAY_MS);
  const sinceDaily = new Date(now.getTime() - (DAILY_DAYS + 1) * DAY_MS);
  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const since30 = new Date(now.getTime() - 30 * DAY_MS);

  const signupDayExpr = KST_DAY.replace("%COL%", "created_at");
  const reviewDayExpr = KST_DAY.replace("%COL%", "reviewed_at");

  const [signupRows, activeRows, activeToday, active7, active30] = await Promise.all([
    db.$queryRawUnsafe<DayCountRow[]>(
      `SELECT ${signupDayExpr} AS date, COUNT(*) AS count FROM "User"
       WHERE role = 'USER' AND created_at >= $1 GROUP BY 1`,
      since,
    ),
    db.$queryRawUnsafe<DayCountRow[]>(
      `SELECT ${reviewDayExpr} AS date, COUNT(DISTINCT user_id) AS count FROM "ReviewHistory"
       WHERE reviewed_at >= $1 GROUP BY 1`,
      sinceDaily,
    ),
    db.reviewHistory
      .groupBy({
        by: ["user_id"],
        where: { reviewed_at: { gte: new Date(now.getTime() - DAY_MS) } },
      })
      .then((r) => r.length),
    db.reviewHistory
      .groupBy({ by: ["user_id"], where: { reviewed_at: { gte: since7 } } })
      .then((r) => r.length),
    db.reviewHistory
      .groupBy({ by: ["user_id"], where: { reviewed_at: { gte: since30 } } })
      .then((r) => r.length),
  ]);

  const toRow = (r: DayCountRow) => ({ date: r.date, count: Number(r.count) });
  const signupsByDay = fillDaily(weekDays, signupRows.map(toRow), (date) => ({ date, count: 0 }));

  const weekly = new Map<string, number>();
  for (const row of signupsByDay) {
    const key = weekStartKey(row.date);
    weekly.set(key, (weekly.get(key) ?? 0) + row.count);
  }

  return {
    signupsDaily: signupsByDay.slice(-DAILY_DAYS),
    signupsWeekly: [...weekly].map(([weekStart, count]) => ({ weekStart, count })),
    activeDaily: fillDaily(dailyKeys, activeRows.map(toRow), (date) => ({ date, count: 0 })),
    active: { today: activeToday, last7: active7, last30: active30 },
  };
});

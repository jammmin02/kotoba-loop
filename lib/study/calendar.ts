import "server-only";

import { toKstDateKey } from "@/lib/datetime";
import { db } from "@/lib/db";

/**
 * `ReviewHistory`(PROMPT 22 통계와 같은 로그 테이블)를 KST 캘린더 날짜로 묶어, 그 달에
 * 학습 기록이 있는 날짜 목록을 반환한다. `getStudyPeriodCounts`(lib/study/stats.ts)와 달리
 * 날짜별로 쪼개야 해서 Prisma groupBy로는 표현할 수 없는 KST 자정 기준 날짜 절단이
 * 필요해 raw SQL을 쓴다.
 */
export async function getStudyCalendarDates(
  userId: string,
  monthStart: Date,
  monthEndExclusive: Date,
): Promise<string[]> {
  const rows = await db.$queryRaw<{ day: Date }[]>`
    SELECT DISTINCT (reviewed_at + interval '9 hours')::date AS day
    FROM "ReviewHistory"
    WHERE user_id = ${userId} AND reviewed_at >= ${monthStart} AND reviewed_at < ${monthEndExclusive}
  `;
  return rows.map((row) => row.day.toISOString().slice(0, 10));
}

/**
 * `StreakFreezeLog`(PROMPT 27.5)에서 그 달 안에 스트릭 프리즈로 보호된 날짜를 뽑는다.
 * `protected_date`는 이미 `lib/game/grant.ts`가 KST 자정 기준 UTC 순간으로 저장해두므로,
 * `getStudyCalendarDates`와 달리 raw SQL 변환 없이 `toKstDateKey`로 바로 포맷할 수 있다.
 */
export async function getProtectedCalendarDates(
  userId: string,
  monthStart: Date,
  monthEndExclusive: Date,
): Promise<string[]> {
  const rows = await db.streakFreezeLog.findMany({
    where: { user_id: userId, protected_date: { gte: monthStart, lt: monthEndExclusive } },
    select: { protected_date: true },
  });
  return rows.map((row) => toKstDateKey(row.protected_date));
}

/**
 * 그 달 안에서 사용자가 새로 등록한 단어 수를 KST 날짜별로 센다. `Vocabulary`에는
 * `user_id`가 없어(단어 재사용/공유 이전이라 항상 등록자 한 명 소유) `UserVocabulary`를
 * 조인해 소유자를 걸러낸 뒤 `Vocabulary.created_at`(등록 시각)을 기준으로 묶는다.
 */
export async function getVocabularyRegistrationCounts(
  userId: string,
  monthStart: Date,
  monthEndExclusive: Date,
): Promise<Record<string, number>> {
  const rows = await db.$queryRaw<{ day: Date; count: number }[]>`
    SELECT (v.created_at + interval '9 hours')::date AS day, COUNT(*)::int AS count
    FROM "Vocabulary" v
    JOIN "UserVocabulary" uv ON uv.vocabulary_id = v.id
    WHERE uv.user_id = ${userId} AND v.created_at >= ${monthStart} AND v.created_at < ${monthEndExclusive}
    GROUP BY day
  `;
  return Object.fromEntries(rows.map((row) => [row.day.toISOString().slice(0, 10), row.count]));
}

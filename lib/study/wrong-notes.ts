import "server-only";

import { startOfKstRollingWeek } from "@/lib/datetime";
import { db } from "@/lib/db";

export const WRONG_NOTE_PERIODS = ["week", "all"] as const;
export type WrongNotePeriod = (typeof WRONG_NOTE_PERIODS)[number];

export interface WrongNoteStat {
  vocabularyId: string;
  totalCount: number;
  correctCount: number;
  wrongCount: number;
  accuracyRate: number;
  lastWrongAt: Date;
}

function periodSince(period: WrongNotePeriod, now: Date): Date | undefined {
  if (period === "all") return undefined;
  return startOfKstRollingWeek(now);
}

/**
 * 단어별 오답 집계. `ReviewHistory`는 `Vocabulary`와 직접 관계를 맺지 않고
 * (target_type으로 kanji와 테이블을 공유하는) target_id 문자열만 가지므로, 총 문제 수와
 * 오답 수를 각각 groupBy로 구한 뒤 애플리케이션에서 합친다. 오답이 한 번도 없는 단어는
 * 오답노트 대상에서 빠진다(빈 상태 요구사항).
 */
export async function getWrongNoteStats(
  userId: string,
  period: WrongNotePeriod,
  now: Date,
): Promise<WrongNoteStat[]> {
  const since = periodSince(period, now);

  const [totals, wrongs] = await Promise.all([
    db.reviewHistory.groupBy({
      by: ["target_id"],
      where: {
        user_id: userId,
        target_type: "vocab",
        ...(since && { reviewed_at: { gte: since } }),
      },
      _count: { _all: true },
    }),
    db.reviewHistory.groupBy({
      by: ["target_id"],
      where: {
        user_id: userId,
        target_type: "vocab",
        result: false,
        ...(since && { reviewed_at: { gte: since } }),
      },
      _count: { _all: true },
      _max: { reviewed_at: true },
    }),
  ]);

  const totalCountById = new Map(totals.map((row) => [row.target_id, row._count._all]));

  return wrongs
    .map((row) => {
      const wrongCount = row._count._all;
      const totalCount = totalCountById.get(row.target_id) ?? wrongCount;
      const correctCount = totalCount - wrongCount;
      return {
        vocabularyId: row.target_id,
        totalCount,
        correctCount,
        wrongCount,
        accuracyRate: totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100),
        // where에 result: false가 있으므로 groupBy 결과가 있는 이상 _max.reviewed_at은 항상 값이 있다.
        lastWrongAt: row._max.reviewed_at as Date,
      };
    })
    .sort((a, b) => b.wrongCount - a.wrongCount);
}

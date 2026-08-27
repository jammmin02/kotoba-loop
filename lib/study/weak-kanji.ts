import "server-only";

import { db } from "@/lib/db";

/** 취약 한자 판정 기준(계획서 37장, PROMPT 40 기본값): 최근 N회 리뷰 중 M회 이상 오답이면 취약으로 본다. */
export const RECENT_REVIEWS_FOR_WEAK_KANJI = 10;
export const MIN_WRONG_FOR_WEAK_KANJI = 3;

export interface WeakKanjiStat {
  kanjiId: string;
  /** 판정에 사용한 최근 리뷰 수(한자별 실제 리뷰가 N회 미만이면 그 실제 값). */
  recentCount: number;
  recentWrongCount: number;
  /** 0~100 정수(백분율). */
  wrongRate: number;
}

/**
 * `ReviewHistory`(단어 리뷰만, target_type='vocab') × `VocabularyKanji`를 조인해 한자별 "최근
 * N회 리뷰" 안에서의 오답 수를 센다. 한자당 최근 N개만 남기는 "그룹별 최근 N개" 집계는 Prisma
 * groupBy로 표현할 수 없어(오답노트, lib/study/wrong-notes.ts와 달리 전체 기간이 아니라 최근
 * 리뷰 순서 자체가 기준이라) 오답노트/캘린더(lib/study/calendar.ts)와 같은 이유로 raw SQL의
 * 윈도우 함수(ROW_NUMBER)를 쓴다. 같은 단어가 여러 한자를 포함하면 그 리뷰 한 건이 포함된
 * 한자마다 각각 집계되는데, 이는 의도된 동작이다(예: "見逃す" 오답은 見/逃 양쪽 모두의 최근
 * 리뷰 이력에 반영되어야 한다).
 */
export async function getWeakKanjiStats(userId: string): Promise<WeakKanjiStat[]> {
  const rows = await db.$queryRaw<{ kanji_id: string; recent_count: number; wrong_count: number }[]>`
    WITH kanji_reviews AS (
      SELECT vk.kanji_id, rh.result,
             ROW_NUMBER() OVER (PARTITION BY vk.kanji_id ORDER BY rh.reviewed_at DESC) AS rn
      FROM "ReviewHistory" rh
      JOIN "VocabularyKanji" vk ON vk.vocabulary_id = rh.target_id
      WHERE rh.user_id = ${userId} AND rh.target_type = 'vocab'::"ReviewTargetType"
    )
    SELECT kanji_id,
           COUNT(*)::int AS recent_count,
           COUNT(*) FILTER (WHERE result = false)::int AS wrong_count
    FROM kanji_reviews
    WHERE rn <= ${RECENT_REVIEWS_FOR_WEAK_KANJI}
    GROUP BY kanji_id
    HAVING COUNT(*) FILTER (WHERE result = false) >= ${MIN_WRONG_FOR_WEAK_KANJI}
  `;

  return rows
    .map((row) => ({
      kanjiId: row.kanji_id,
      recentCount: row.recent_count,
      recentWrongCount: row.wrong_count,
      wrongRate: Math.round((row.wrong_count / row.recent_count) * 100),
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate || b.recentWrongCount - a.recentWrongCount);
}

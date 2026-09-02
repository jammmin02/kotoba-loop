import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { addKstDays, startOfKstDay } from "@/lib/datetime";
import { db } from "@/lib/db";
import { parseTodayTargetOverrides } from "@/lib/study/plan-overrides";
import { getTodayKanjiQueue, getTodayQueueBuckets } from "@/lib/study/queries";
import {
  estimateStudyMinutes,
  formatEstimatedTimeLabel,
  REVIEW_CATEGORY_KEYS,
  TODAY_SUMMARY_CATEGORY_LABELS,
} from "@/lib/study/today-summary";
import type { TodaySummaryCategory, TodaySummaryResponse } from "@/types/study";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(async (req: NextRequest): Promise<TodaySummaryResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const userId = session.user.id;
  const now = new Date();
  const startOfToday = startOfKstDay(now);
  const startOfTomorrow = addKstDays(startOfToday, 1);
  const { newWordTarget, kanjiTarget } = parseTodayTargetOverrides(req.nextUrl.searchParams);

  const [
    { newWordIds, reviewIdsByCategory, weakIds },
    completedToday,
    totalVocabularyCount,
    kanjiQueue,
  ] = await Promise.all([
    getTodayQueueBuckets(userId, now, db, newWordTarget),
    db.userVocabulary.count({
      where: {
        user_id: userId,
        last_reviewed_at: { gte: startOfToday, lt: startOfTomorrow },
      },
    }),
    db.userVocabulary.count({ where: { user_id: userId } }),
    getTodayKanjiQueue(userId, now, db, kanjiTarget),
  ]);
  const todayKanjiCount =
    kanjiQueue.newKanjiIds.length +
    kanjiQueue.reviewKanjiIds.length +
    kanjiQueue.weakKanjiIds.length;

  const totalCount =
    newWordIds.length +
    REVIEW_CATEGORY_KEYS.reduce((sum, key) => sum + reviewIdsByCategory[key].length, 0) +
    weakIds.length;

  const categories: TodaySummaryCategory[] = [
    { key: "newWords", label: TODAY_SUMMARY_CATEGORY_LABELS.newWords, count: newWordIds.length },
    ...REVIEW_CATEGORY_KEYS.map((key) => ({
      key,
      label: TODAY_SUMMARY_CATEGORY_LABELS[key],
      count: reviewIdsByCategory[key].length,
    })),
    { key: "weak", label: TODAY_SUMMARY_CATEGORY_LABELS.weak, count: weakIds.length },
  ];

  return {
    categories,
    totalCount,
    estimatedMinutes: estimateStudyMinutes(totalCount),
    estimatedTimeLabel: formatEstimatedTimeLabel(totalCount),
    completedToday,
    hasAnyVocabulary: totalVocabularyCount > 0,
    todayKanjiCount,
  };
});

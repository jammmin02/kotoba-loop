import { addKstDays, startOfKstDay } from "@/lib/datetime";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { DAILY_KANJI_TARGET } from "@/lib/study/constants";
import { categorizeReviewStage, type ReviewCategoryKey } from "@/lib/study/today-summary";
import { ONBOARDING_DEFAULTS } from "@/lib/validations/onboarding";

export interface TodayQueueBuckets {
  newWordIds: string[];
  reviewIdsByCategory: Record<ReviewCategoryKey, string[]>;
  weakIds: string[];
}

/**
 * PROMPT 17(요약 카운트)과 PROMPT 18(학습 카드 큐)이 공유하는 집계 쿼리.
 * 요약 화면은 각 배열의 길이만 쓰고, 학습 카드 큐는 실제 vocabulary_id 순서를
 * 그대로 큐 구성에 사용한다 — 두 화면의 숫자가 항상 일치하도록 로직을 한 곳에 둔다.
 *
 * `client`를 넘기면(PROMPT 24 — 게임화) 진행 중인 `db.$transaction` 안에서 방금 커밋되지
 * 않은 SRS 갱신(예: next_review_at)까지 포함해 "오늘의 학습 완료" 여부를 판정할 수 있다.
 */
export async function getTodayQueueBuckets(
  userId: string,
  now: Date,
  client: typeof db | Prisma.TransactionClient = db,
  /** AI 추천 학습량(PROMPT 43)을 "오늘만" 적용할 때 `daily_word_target` 대신 쓰는 값.
   * 온보딩 설정 자체는 건드리지 않는 임시 조정이라 DB에 쓰지 않고 매 요청마다 전달받는다. */
  dailyWordTargetOverride?: number,
): Promise<TodayQueueBuckets> {
  const startOfToday = startOfKstDay(now);
  const startOfTomorrow = addKstDays(startOfToday, 1);

  const [user, newWords, dueReviews, weakWords] = await Promise.all([
    client.user.findUniqueOrThrow({ where: { id: userId }, select: { daily_word_target: true } }),
    client.userVocabulary.findMany({
      where: { user_id: userId, learning_status: "NEW" },
      select: { vocabulary_id: true },
      orderBy: { vocabulary: { created_at: "asc" } },
    }),
    client.userVocabulary.findMany({
      where: {
        user_id: userId,
        learning_status: { in: ["LEARNING", "REVIEW", "MASTERED"] },
        next_review_at: { lt: startOfTomorrow },
      },
      select: { vocabulary_id: true, interval_stage: true },
      orderBy: { next_review_at: "asc" },
    }),
    client.userVocabulary.findMany({
      where: { user_id: userId, learning_status: "WEAK" },
      select: { vocabulary_id: true },
      // 가장 많이 틀린 단어부터 재시험하도록 우선순위를 둔다.
      orderBy: { wrong_count: "desc" },
    }),
  ]);

  const dailyWordTarget =
    dailyWordTargetOverride ?? user.daily_word_target ?? ONBOARDING_DEFAULTS.dailyWordTarget;
  const newWordIds = newWords.slice(0, dailyWordTarget).map((row) => row.vocabulary_id);

  const reviewIdsByCategory: Record<ReviewCategoryKey, string[]> = {
    yesterday: [],
    day3: [],
    day7: [],
    day14Plus: [],
  };
  for (const row of dueReviews) {
    reviewIdsByCategory[categorizeReviewStage(row.interval_stage)].push(row.vocabulary_id);
  }

  return { newWordIds, reviewIdsByCategory, weakIds: weakWords.map((row) => row.vocabulary_id) };
}

export interface TodayKanjiQueue {
  newKanjiIds: string[];
  reviewKanjiIds: string[];
  weakKanjiIds: string[];
}

/**
 * "오늘의 한자"(PROMPT 36) — `getTodayQueueBuckets`(단어)의 한자 버전. `UserKanji`는 첫 리뷰
 * 전까지 행이 없으므로(PROMPT 35), 신규 한자는 "행이 없는 한자"로 판정한다. 常用漢字 전체가
 * 2,136자로 고정돼 있어(PROMPT 33) 전량을 불러와도 부담이 없다(`GET /api/kanji`와 동일 전례).
 */
export async function getTodayKanjiQueue(
  userId: string,
  now: Date,
  client: typeof db | Prisma.TransactionClient = db,
  /** AI 추천 학습량(PROMPT 43)을 "오늘만" 적용할 때 고정값 `DAILY_KANJI_TARGET` 대신 쓰는 값. */
  kanjiTargetOverride?: number,
): Promise<TodayKanjiQueue> {
  const startOfTomorrow = addKstDays(startOfKstDay(now), 1);

  const [allKanji, userKanjiRows] = await Promise.all([
    client.kanji.findMany({
      orderBy: [{ school_grade: "asc" }, { stroke_count: "asc" }, { character: "asc" }],
      select: { id: true },
    }),
    client.userKanji.findMany({
      where: { user_id: userId },
      select: { kanji_id: true, learning_status: true, next_review_at: true },
    }),
  ]);

  const userKanjiByKanjiId = new Map(userKanjiRows.map((row) => [row.kanji_id, row]));
  const newKanjiIds = allKanji
    .map((row) => row.id)
    .filter((id) => !userKanjiByKanjiId.has(id))
    .slice(0, kanjiTargetOverride ?? DAILY_KANJI_TARGET);

  const reviewKanjiIds: string[] = [];
  const weakKanjiIds: string[] = [];
  for (const row of userKanjiRows) {
    if (row.learning_status === "WEAK") {
      weakKanjiIds.push(row.kanji_id);
    } else if (
      row.learning_status !== "NEW" &&
      row.next_review_at &&
      row.next_review_at < startOfTomorrow
    ) {
      reviewKanjiIds.push(row.kanji_id);
    }
  }

  return { newKanjiIds, reviewKanjiIds, weakKanjiIds };
}

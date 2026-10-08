import { addKstDays, startOfKstDay } from "@/lib/datetime";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { DAILY_KANJI_TARGET } from "@/lib/study/constants";
import { computeDailyAllowance, takeWithinAllowance } from "@/lib/study/daily-limits";
import { categorizeReviewStage, type ReviewCategoryKey } from "@/lib/study/today-summary";
import { ONBOARDING_DEFAULTS } from "@/lib/validations/onboarding";

/** 오늘의 학습량 상한과 진행 현황 — 홈 요약이 "신규 3/10 · 복습 20/50"을 보여주는 데 쓴다. */
export interface TodayLimitState {
  newTarget: number;
  /** null이면 복습 수에 제한이 없다. */
  reviewLimit: number | null;
  newIntroducedToday: number;
  reviewedToday: number;
  /** 상한 때문에 큐에서 빠진(= "더 학습하기"로 이어서 할 수 있는) 신규/복습 개수. */
  hiddenNewCount: number;
  hiddenReviewCount: number;
}

export interface TodayQueueBuckets {
  newWordIds: string[];
  reviewIdsByCategory: Record<ReviewCategoryKey, string[]>;
  weakIds: string[];
  limits: TodayLimitState;
}

export interface TodayQueueOptions {
  /** true면 오늘의 신규/복습 상한을 무시한다("더 학습하기"). 신규는 목표 개수만큼 한 번 더 뽑는다. */
  ignoreDailyLimits?: boolean;
}

/**
 * 오늘(KST) 학습 현황을 기존 `ReviewHistory`에서 구한다 — 별도 컬럼 없이도 "오늘 처음 시작한
 * 단어"와 "오늘 복습한 단어"를 나눌 수 있다. 오늘 기록이 있는 단어 중 그 이전 기록이 없으면
 * 오늘 처음 학습한 단어, 있으면 복습한 단어다. 오답 복습(현재 WEAK)은 복습 상한 대상이 아니므로
 * 복습 수에서 뺀다(채점 직후 WEAK가 된 단어는 이 집계에서 빠져 상한이 약간 넉넉해질 수 있다).
 */
async function getTodayStudyCounts(
  userId: string,
  startOfToday: Date,
  startOfTomorrow: Date,
  client: typeof db | Prisma.TransactionClient,
): Promise<{ newIntroducedToday: number; reviewedToday: number }> {
  const today = await client.reviewHistory.findMany({
    where: {
      user_id: userId,
      target_type: "vocab",
      reviewed_at: { gte: startOfToday, lt: startOfTomorrow },
    },
    select: { target_id: true },
    distinct: ["target_id"],
  });
  if (today.length === 0) return { newIntroducedToday: 0, reviewedToday: 0 };

  const todayIds = today.map((row) => row.target_id);
  const earlier = await client.reviewHistory.findMany({
    where: {
      user_id: userId,
      target_type: "vocab",
      target_id: { in: todayIds },
      reviewed_at: { lt: startOfToday },
    },
    select: { target_id: true },
    distinct: ["target_id"],
  });
  const earlierIds = earlier.map((row) => row.target_id);

  const reviewedToday =
    earlierIds.length === 0
      ? 0
      : await client.userVocabulary.count({
          where: {
            user_id: userId,
            vocabulary_id: { in: earlierIds },
            learning_status: { not: "WEAK" },
          },
        });

  return { newIntroducedToday: todayIds.length - earlierIds.length, reviewedToday };
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
  options: TodayQueueOptions = {},
): Promise<TodayQueueBuckets> {
  const startOfToday = startOfKstDay(now);
  const startOfTomorrow = addKstDays(startOfToday, 1);

  const [user, newWords, dueReviews, weakWords, todayCounts] = await Promise.all([
    client.user.findUniqueOrThrow({
      where: { id: userId },
      select: { daily_word_target: true, daily_review_limit: true },
    }),
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
    getTodayStudyCounts(userId, startOfToday, startOfTomorrow, client),
  ]);

  const dailyWordTarget =
    dailyWordTargetOverride ?? user.daily_word_target ?? ONBOARDING_DEFAULTS.dailyWordTarget;
  const reviewLimit = user.daily_review_limit;

  // 신규는 "오늘 이미 시작한 만큼"을 뺀 몫만, 복습은 상한이 있으면 그 몫만 큐에 넣는다.
  // "더 학습하기"(ignoreDailyLimits)는 신규를 목표 개수만큼 한 번 더 뽑고 복습은 전부 넣는다.
  const allowance = options.ignoreDailyLimits
    ? { newRemaining: dailyWordTarget, reviewRemaining: null }
    : computeDailyAllowance({
        newTarget: dailyWordTarget,
        reviewLimit,
        newIntroducedToday: todayCounts.newIntroducedToday,
        reviewedToday: todayCounts.reviewedToday,
      });
  const cappedNew = takeWithinAllowance(newWords, allowance.newRemaining);
  const cappedReviews = takeWithinAllowance(dueReviews, allowance.reviewRemaining);
  const newWordIds = cappedNew.map((row) => row.vocabulary_id);

  const reviewIdsByCategory: Record<ReviewCategoryKey, string[]> = {
    yesterday: [],
    day3: [],
    day7: [],
    day14Plus: [],
  };
  for (const row of cappedReviews) {
    reviewIdsByCategory[categorizeReviewStage(row.interval_stage)].push(row.vocabulary_id);
  }

  return {
    newWordIds,
    reviewIdsByCategory,
    weakIds: weakWords.map((row) => row.vocabulary_id),
    limits: {
      newTarget: dailyWordTarget,
      reviewLimit,
      newIntroducedToday: todayCounts.newIntroducedToday,
      reviewedToday: todayCounts.reviewedToday,
      // 신규는 한 번에 목표 개수까지만 보여주므로, 남은 NEW 단어 중 "다음 묶음"이 있는지로 판단한다.
      hiddenNewCount: Math.min(newWords.length - cappedNew.length, dailyWordTarget),
      hiddenReviewCount: dueReviews.length - cappedReviews.length,
    },
  };
}

export interface TodayKanjiQueue {
  newKanjiIds: string[];
  reviewKanjiIds: string[];
  weakKanjiIds: string[];
}

/**
 * "오늘의 한자"(PROMPT 36) — `getTodayQueueBuckets`(단어)의 한자 버전. `UserKanji`는 첫 리뷰
 * 전까지 행이 없으므로(PROMPT 35), 기본적으로 신규 한자는 "행이 없는 한자"로 판정한다.
 * 다만 한자 퀴즈 연습 모드의 즐겨찾기(`GET /api/kanji/[character]/favorite`)는 리뷰 전에도
 * 행을 먼저 만들 수 있어, "행 존재"가 아니라 `learning_status === "NEW"`까지 함께 신규로
 * 본다 — 그래야 즐겨찾기만 해두고 아직 안 배운 한자가 오늘의 학습 큐에서 사라지지 않는다.
 * 常用漢字 전체가 2,136자로 고정돼 있어(PROMPT 33) 전량을 불러와도 부담이 없다
 * (`GET /api/kanji`와 동일 전례).
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
    .filter((id) => (userKanjiByKanjiId.get(id)?.learning_status ?? "NEW") === "NEW")
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

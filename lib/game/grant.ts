import "server-only";

import { checkKanjiStudyAchievements, checkWordStudyAchievements } from "@/lib/achievement/service";
import { addKstDays, startOfKstDay } from "@/lib/datetime";
import { EXP_REWARDS } from "@/lib/game/constants";
import { grantExp } from "@/lib/game/exp";
import { applyStreakUpdate } from "@/lib/game/streak";
import type { ExpGainResult } from "@/lib/game/types";
import type { Prisma } from "@/lib/generated/prisma/client";
import { syncPetGrowth } from "@/lib/pet/service";
import type { QuestCode } from "@/lib/quest/constants";
import { incrementQuestProgress } from "@/lib/quest/service";
import { getTodayKanjiQueue, getTodayQueueBuckets } from "@/lib/study/queries";
import { REVIEW_CATEGORY_KEYS } from "@/lib/study/today-summary";
import type { UnlockedAchievementView } from "@/types/achievement";
import type { PetGrowthResult } from "@/types/pet";

export interface GameProfileGain extends ExpGainResult {
  expGained: number;
  /** 이 액션으로 방금 완료된 Daily Quest 코드들 — Quest Card 완료 체크 애니메이션 트리거용
   * (components/game/quest-complete-store.ts). 없으면 빈 배열. */
  completedQuestCodes: string[];
  /** 이 액션으로 방금 잠금 해제된 업적(PROMPT 27). 없으면 빈 배열. */
  unlockedAchievements: UnlockedAchievementView[];
  /** 이 액션의 레벨업으로 펫이 방금 성장/졸업했을 때만(다마고치 펫, 계획서 외 신규 기능).
   * 활성 펫이 없거나 단계 변화가 없으면 null. */
  petGrowth: PetGrowthResult | null;
}

export interface GrantActionExpOptions {
  /** 이 액션이 단어 하나를 `learning_status` NEW에서 벗어나게 했을 때만 true로 넘긴다
   * (호출부가 이미 알고 있는 정보 — review-result 라우트의 `wasNew`). true일 때만 "N단어 학습"
   * 업적 조건을 체크한다(그 외 호출은 학습 카운트를 바꾸지 않으므로 체크가 무의미하다). */
  checkWordStudyAchievement?: boolean;
  /** 위와 동일한 이유로, 이 액션이 한자 하나를 처음 학습(=`UserKanji` 행이 방금 생성됨)했을
   * 때만 true로 넘긴다(PROMPT 36 — 한자 퀴즈 제출 라우트의 `wasNewKanji`). */
  checkKanjiStudyAchievement?: boolean;
}

/**
 * "오늘의 학습 완료" +10 EXP를 1회만 지급한다. `last_studied_date`가 오늘(KST)과 같으면
 * 이미 지급된 것으로 보고 건너뛴다. "완료" 판정은 PROMPT 17의 `TodaySummaryView`가 쓰는
 * `totalCount === 0 && hasAnyVocabulary` 정의에, PROMPT 36의 한자 리뷰/취약 큐가 비어있다는
 * 조건을 더한 것이다(PROMPT 37 통합 회귀에서 발견 — 이 함수는 모든 `grantActionExp` 호출에서
 * 무조건 실행되는데 한자를 전혀 고려하지 않아, 단어 큐가 이미 비어있는 날 한자 답을 하나만
 * 맞혀도 완료 보너스/스트릭이 그대로 올라가 버렸다).
 *
 * 한자의 "신규(new)" 버킷은 일부러 이 판정에서 제외한다 — 단어의 `newWordIds`는 사용자가
 * 직접 등록한 유한한 단어장에서 나와 실제로 0에 수렴하지만, 한자의 신규 버킷은 常用漢字
 * 2,136자라는 전역 풀에서 매번 다시 채워지는 사실상 무한한 스트림이라(하루 10자씩 공부해도
 * 전량 소진까지 약 7개월) 이걸 요구하면 "완료" 자체가 사실상 영원히 불가능해진다. 반면
 * 리뷰/취약 버킷은 사용자가 이미 배우기 시작한 한자만 담겨 있어 단어처럼 실제로 0에 도달할
 * 수 있으므로, "오늘 예정된 복습을 다 마쳤는지"만 완료 조건에 포함한다.
 *
 * `grantActionExp`를 통해서만 호출되며, 그 시점에 이미 `grantExp`가 프로필 행 존재를
 * 보장했으므로 여기서는 별도 upsert 없이 조회한다.
 */
async function maybeGrantDailyCompletionBonus(
  tx: Prisma.TransactionClient,
  userId: string,
  now: Date,
): Promise<{ granted: boolean; result?: ExpGainResult }> {
  const today = startOfKstDay(now);

  const rows = await tx.$queryRaw<
    {
      last_studied_date: Date | null;
      current_streak: number;
      longest_streak: number;
      streak_freeze_count: number;
    }[]
  >`
    SELECT last_studied_date, current_streak, longest_streak, streak_freeze_count
    FROM "UserGameProfile" WHERE user_id = ${userId} FOR UPDATE
  `;
  const row = rows[0];
  const lastStudiedDate = row?.last_studied_date ?? null;
  if (lastStudiedDate && lastStudiedDate.getTime() === today.getTime()) {
    return { granted: false };
  }

  const [{ newWordIds, reviewIdsByCategory, weakIds }, totalVocabularyCount, kanjiQueue] =
    await Promise.all([
      getTodayQueueBuckets(userId, now, tx),
      tx.userVocabulary.count({ where: { user_id: userId } }),
      getTodayKanjiQueue(userId, now, tx),
    ]);
  const remaining =
    newWordIds.length +
    REVIEW_CATEGORY_KEYS.reduce((sum, key) => sum + reviewIdsByCategory[key].length, 0) +
    weakIds.length +
    kanjiQueue.reviewKanjiIds.length +
    kanjiQueue.weakKanjiIds.length;

  if (remaining > 0 || totalVocabularyCount === 0) {
    return { granted: false };
  }

  const streak = applyStreakUpdate(
    {
      currentStreak: row?.current_streak ?? 0,
      longestStreak: row?.longest_streak ?? 0,
      lastStudiedDate,
    },
    today,
    row?.streak_freeze_count ?? 0,
  );

  const result = await grantExp(tx, userId, EXP_REWARDS.DAILY_COMPLETE);
  await tx.userGameProfile.update({
    where: { user_id: userId },
    data: {
      last_studied_date: today,
      current_streak: streak.currentStreak,
      longest_streak: streak.longestStreak,
      // grantExp가 방금 레벨업으로 streak_freeze_count를 이미 늘렸을 수 있으므로, 여기서는
      // 그 시점의 최신 DB 값을 기준으로 삼는 atomic decrement로 소비한다(읽어둔 row 값을
      // 그대로 다시 쓰면 grantExp의 지급분을 덮어써 버린다).
      ...(streak.freezeConsumed
        ? { streak_freeze_count: { decrement: 1 }, streak_freeze_notice_pending: true }
        : {}),
    },
  });

  if (streak.freezeConsumed) {
    // 자동 보호가 발동한 날은 "어제"(정확히 하루만 건너뛴 그 날) — 캘린더가 이 날짜를
    // ❄️로 구분 표시한다(GET /api/game/calendar).
    await tx.streakFreezeLog.create({
      data: { user_id: userId, protected_date: addKstDays(today, -1) },
    });
  }

  return { granted: true, result };
}

/**
 * 학습 액션 하나가 끝날 때마다 호출하는 단일 진입점(라우트가 직접 부르는 유일한 함수).
 * 액션분 EXP를 지급하고, 이어서 오늘의 학습 완료 여부를 항상 확인한다 — 정답/오답과 무관하게
 * 리뷰 1건은 항상 next_review_at을 미래로 밀어 오늘 큐에서 빠지므로, 오답이어도 마지막 항목이면
 * 완료 보너스를 놓치면 안 된다.
 *
 * `questIncrements`는 이 액션이 어떤 Daily Quest를 얼마나 진행시켰는지를 호출부(라우트)가
 * 판단해서 넘긴다 — "새 단어인지/정답인지/원래 WEAK였는지"는 각 라우트가 이미 알고 있는
 * 정보라 여기서 다시 조회하지 않는다(PROMPT 25 — 퀘스트 보상도 이 함수의 EXP 지급 로직을
 * 그대로 재사용한다).
 */
export async function grantActionExp(
  tx: Prisma.TransactionClient,
  userId: string,
  actionExp: number,
  now: Date,
  questIncrements: Partial<Record<QuestCode, number>> = {},
  options: GrantActionExpOptions = {},
): Promise<GameProfileGain> {
  let result = await grantExp(tx, userId, actionExp);
  let expGained = actionExp;
  let leveledUp = result.leveledUp;
  const completedQuestCodes: string[] = [];

  const bonus = await maybeGrantDailyCompletionBonus(tx, userId, now);
  if (bonus.granted && bonus.result) {
    result = bonus.result;
    expGained += EXP_REWARDS.DAILY_COMPLETE;
    leveledUp = leveledUp || bonus.result.leveledUp;
  }

  for (const [code, amount] of Object.entries(questIncrements) as [
    QuestCode,
    number | undefined,
  ][]) {
    if (!amount) continue;
    const questGain = await incrementQuestProgress(tx, userId, code, now, amount);
    if (!questGain) continue;
    result = { level: questGain.level, exp: questGain.exp, leveledUp: questGain.leveledUp };
    expGained += questGain.expGained;
    leveledUp = leveledUp || questGain.leveledUp;
    completedQuestCodes.push(...questGain.completedQuestCodes);
  }

  const unlockedAchievements = [
    ...(options.checkWordStudyAchievement ? await checkWordStudyAchievements(tx, userId) : []),
    ...(options.checkKanjiStudyAchievement ? await checkKanjiStudyAchievements(tx, userId) : []),
  ];

  // 펫 성장 단계는 레벨업 시에만 바뀔 수 있으므로, 레벨업이 없었던 액션은 조회 자체를 건너뛴다.
  const petGrowth = leveledUp ? await syncPetGrowth(tx, userId, result.level) : null;

  return {
    expGained,
    level: result.level,
    exp: result.exp,
    leveledUp,
    completedQuestCodes,
    unlockedAchievements,
    petGrowth,
  };
}

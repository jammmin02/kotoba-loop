import "server-only";

import {
  KANJI_ACHIEVEMENT_SEEDS,
  WORD_REGISTER_ACHIEVEMENT_SEEDS,
  WORD_STUDY_ACHIEVEMENT_SEEDS,
} from "@/lib/achievement/constants";
import { selectEligibleAchievementCodes } from "@/lib/achievement/engine";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { AchievementView, UnlockedAchievementView } from "@/types/achievement";

/**
 * `count`(등록 수/학습 수 등) 기준으로 방금 조건을 만족한 업적을 잠금 해제한다. EXP/퀘스트
 * 카운터와 달리 업적은 매번 실제 데이터에서 다시 세는 단조 증가 값이라 `FOR UPDATE` 락까지는
 * 필요 없다 — 이미 해제된 업적은 유니크 제약(user_id, achievement_id)이 막아주고, 어떤 코드가
 * "방금" 해제됐는지는 삽입 전 조회로 판단한다(동시 요청 경합 시 아주 드물게 토스트가 두 번
 * 뜰 수 있지만, 데이터 정합성에는 영향이 없다 — `skipDuplicates`가 중복 삽입을 흡수한다).
 */
async function unlockEligible(
  tx: Prisma.TransactionClient,
  userId: string,
  seeds: { code: string; conditionValue: number }[],
  count: number,
): Promise<UnlockedAchievementView[]> {
  const eligibleCodes = selectEligibleAchievementCodes(seeds, count);
  if (eligibleCodes.length === 0) return [];

  const achievements = await tx.achievement.findMany({ where: { code: { in: eligibleCodes } } });
  if (achievements.length === 0) return [];

  const alreadyUnlocked = await tx.userAchievement.findMany({
    where: { user_id: userId, achievement_id: { in: achievements.map((a) => a.id) } },
    select: { achievement_id: true },
  });
  const alreadyUnlockedIds = new Set(alreadyUnlocked.map((row) => row.achievement_id));
  const newlyUnlocked = achievements.filter((a) => !alreadyUnlockedIds.has(a.id));
  if (newlyUnlocked.length === 0) return [];

  await tx.userAchievement.createMany({
    data: newlyUnlocked.map((a) => ({ user_id: userId, achievement_id: a.id })),
    skipDuplicates: true,
  });

  return newlyUnlocked.map((a) => ({ code: a.code, title: a.title, category: a.category }));
}

/** "첫 단어 등록" — POST /api/vocabularies가 UserVocabulary를 생성한 직후, 같은 트랜잭션에서
 * 호출한다. */
export async function checkWordRegisterAchievements(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<UnlockedAchievementView[]> {
  const registeredCount = await tx.userVocabulary.count({ where: { user_id: userId } });
  return unlockEligible(tx, userId, WORD_REGISTER_ACHIEVEMENT_SEEDS, registeredCount);
}

/** "N단어 학습" 임계값 — `learning_status`가 NEW를 벗어난 단어 수 기준(이 문서가 확정한 정의).
 * 단어 하나가 방금 NEW를 벗어난 액션에서만 호출한다(lib/game/grant.ts의 `grantActionExp`가
 * `checkWordStudyAchievement` 옵션으로 넘겨받아 같은 트랜잭션에서 실행). */
export async function checkWordStudyAchievements(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<UnlockedAchievementView[]> {
  const studiedCount = await tx.userVocabulary.count({
    where: { user_id: userId, learning_status: { not: "NEW" } },
  });
  return unlockEligible(tx, userId, WORD_STUDY_ACHIEVEMENT_SEEDS, studiedCount);
}

/** "N자 학습" 임계값(PROMPT 36) — `learning_status`가 NEW를 벗어난 한자 수 기준. `UserKanji`는
 * 첫 리뷰 전까지 행 자체가 없어(PROMPT 35), 행이 방금 새로 생긴 한자 퀴즈 제출에서만 호출한다
 * (lib/game/grant.ts의 `grantActionExp`가 `checkKanjiStudyAchievement` 옵션으로 넘겨받아 같은
 * 트랜잭션에서 실행 — `checkWordStudyAchievements`와 완전히 동일한 패턴). */
export async function checkKanjiStudyAchievements(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<UnlockedAchievementView[]> {
  const studiedCount = await tx.userKanji.count({
    where: { user_id: userId, learning_status: { not: "NEW" } },
  });
  return unlockEligible(tx, userId, KANJI_ACHIEVEMENT_SEEDS, studiedCount);
}

/** 업적 목록 화면(Collection Grid) — 전체 카탈로그에 이 사용자의 unlocked 여부를 붙여 반환한다. */
export async function getAchievementsView(userId: string): Promise<AchievementView[]> {
  const [achievements, unlocked] = await Promise.all([
    db.achievement.findMany({ orderBy: { condition_value: "asc" } }),
    db.userAchievement.findMany({ where: { user_id: userId } }),
  ]);
  const unlockedAtByAchievementId = new Map(
    unlocked.map((row) => [row.achievement_id, row.unlocked_at]),
  );

  return achievements.map((achievement) => {
    const unlockedAt = unlockedAtByAchievementId.get(achievement.id) ?? null;
    return {
      code: achievement.code,
      category: achievement.category,
      title: achievement.title,
      conditionValue: achievement.condition_value,
      unlocked: unlockedAt !== null,
      unlockedAt: unlockedAt ? formatKstISOString(unlockedAt) : null,
    };
  });
}

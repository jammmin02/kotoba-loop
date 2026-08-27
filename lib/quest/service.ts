import "server-only";

import { db } from "@/lib/db";
import { grantExp } from "@/lib/game/exp";
import type { ExpGainResult } from "@/lib/game/types";
import type { Prisma } from "@/lib/generated/prisma/client";
import { DAILY_QUEST_CODES, QUEST_ALL_COMPLETE_BONUS_EXP } from "@/lib/quest/constants";
import type { QuestCode } from "@/lib/quest/constants";
import {
  applyQuestIncrement,
  formatQuestTitle,
  getQuestDateKey,
  resolveQuestTarget,
} from "@/lib/quest/engine";
import { ONBOARDING_DEFAULTS } from "@/lib/validations/onboarding";

export interface DailyQuestView {
  code: string;
  title: string;
  current: number;
  target: number;
  rewardExp: number;
  isCompleted: boolean;
}

async function resolveDailyWordTarget(
  client: typeof db | Prisma.TransactionClient,
  userId: string,
): Promise<number> {
  const user = await client.user.findUniqueOrThrow({
    where: { id: userId },
    select: { daily_word_target: true },
  });
  return user.daily_word_target ?? ONBOARDING_DEFAULTS.dailyWordTarget;
}

/**
 * "조회 시점 lazy 생성"(이 PROMPT가 확정한 방식). 오늘 날짜 키의 UserQuestProgress가 없으면
 * 0으로 만들어 반환한다 — 자정이 지나 날짜 키가 바뀌면 그 키의 행은 아직 없으니, 이 upsert 자체가
 * "매일 자정 초기화"를 대신한다(별도 배치/크론이 필요 없다).
 */
export async function getDailyQuestsView(userId: string, now: Date): Promise<DailyQuestView[]> {
  const dateKey = getQuestDateKey(now);

  const [dailyWordTarget, quests] = await Promise.all([
    resolveDailyWordTarget(db, userId),
    db.quest.findMany({ where: { code: { in: DAILY_QUEST_CODES } } }),
  ]);
  const questsByCode = new Map(quests.map((quest) => [quest.code, quest]));
  const orderedQuests = DAILY_QUEST_CODES.map((code) => questsByCode.get(code)).filter(
    (quest): quest is NonNullable<typeof quest> => !!quest,
  );

  const progressRows = await Promise.all(
    orderedQuests.map((quest) =>
      db.userQuestProgress.upsert({
        where: {
          user_id_quest_id_date_or_week_key: {
            user_id: userId,
            quest_id: quest.id,
            date_or_week_key: dateKey,
          },
        },
        update: {},
        create: { user_id: userId, quest_id: quest.id, date_or_week_key: dateKey },
      }),
    ),
  );

  return orderedQuests.map((quest, index) => {
    const target = resolveQuestTarget(quest.code, quest.target_count, dailyWordTarget);
    const progress = progressRows[index];
    return {
      code: quest.code,
      title: formatQuestTitle(quest.title, target),
      current: Math.min(progress.current_count, target),
      target,
      rewardExp: quest.exp_reward,
      isCompleted: progress.is_completed,
    };
  });
}

export interface QuestIncrementGain extends ExpGainResult {
  expGained: number;
  completedQuestCodes: QuestCode[];
}

/**
 * 전체 Daily Quest가 방금 다 완료됐을 때만 보너스를 지급한다. `incrementQuestProgress`가
 * 어떤 퀘스트를 막 완료시킨 트랜잭션에서만 호출하므로(아래 참고), 이 조건이 처음 참이 되는
 * 순간은 하루에 정확히 한 번뿐이다 — 완료 상태는 되돌아가지 않고, 각 퀘스트는 하루에 한 번만
 * "막 완료"될 수 있기 때문에 별도의 지급 여부 플래그 없이도 중복 지급이 생기지 않는다.
 */
async function maybeGrantAllQuestsCompleteBonus(
  tx: Prisma.TransactionClient,
  userId: string,
  dateKey: string,
): Promise<ExpGainResult | null> {
  const completedCount = await tx.userQuestProgress.count({
    where: {
      user_id: userId,
      date_or_week_key: dateKey,
      is_completed: true,
      quest: { code: { in: DAILY_QUEST_CODES } },
    },
  });
  if (completedCount < DAILY_QUEST_CODES.length) return null;

  return grantExp(tx, userId, QUEST_ALL_COMPLETE_BONUS_EXP);
}

/**
 * 학습 액션 하나가 특정 Daily Quest의 진행도를 `amount`만큼 올린다. `grantActionExp`(lib/game/grant.ts)
 * 안에서만 호출되며, 그 시점에 열려 있는 트랜잭션을 그대로 재사용한다. 방금 완료된 게 없으면
 * `null`을 반환해 호출부가 별도 처리 없이 넘어가게 한다.
 */
export async function incrementQuestProgress(
  tx: Prisma.TransactionClient,
  userId: string,
  code: QuestCode,
  now: Date,
  amount: number,
): Promise<QuestIncrementGain | null> {
  if (amount <= 0) return null;

  const dateKey = getQuestDateKey(now);
  const [quest, dailyWordTarget] = await Promise.all([
    tx.quest.findUniqueOrThrow({ where: { code } }),
    resolveDailyWordTarget(tx, userId),
  ]);
  const target = resolveQuestTarget(code, quest.target_count, dailyWordTarget);

  await tx.$executeRaw`
    INSERT INTO "UserQuestProgress" (user_id, quest_id, date_or_week_key, current_count, is_completed)
    VALUES (${userId}, ${quest.id}, ${dateKey}, 0, false)
    ON CONFLICT (user_id, quest_id, date_or_week_key) DO NOTHING
  `;
  const rows = await tx.$queryRaw<{ current_count: number; is_completed: boolean }[]>`
    SELECT current_count, is_completed FROM "UserQuestProgress"
    WHERE user_id = ${userId} AND quest_id = ${quest.id} AND date_or_week_key = ${dateKey}
    FOR UPDATE
  `;
  const state = rows[0];
  const increment = applyQuestIncrement(
    { currentCount: state.current_count, isCompleted: state.is_completed },
    target,
    amount,
  );

  await tx.userQuestProgress.update({
    where: {
      user_id_quest_id_date_or_week_key: {
        user_id: userId,
        quest_id: quest.id,
        date_or_week_key: dateKey,
      },
    },
    data: { current_count: increment.currentCount, is_completed: increment.isCompleted },
  });

  if (!increment.justCompleted) return null;

  const questGain = await grantExp(tx, userId, quest.exp_reward);
  let expGained = quest.exp_reward;
  let leveledUp = questGain.leveledUp;
  let level = questGain.level;
  let exp = questGain.exp;

  const bonus = await maybeGrantAllQuestsCompleteBonus(tx, userId, dateKey);
  if (bonus) {
    level = bonus.level;
    exp = bonus.exp;
    leveledUp = leveledUp || bonus.leveledUp;
    expGained += QUEST_ALL_COMPLETE_BONUS_EXP;
  }

  return { expGained, level, exp, leveledUp, completedQuestCodes: [code] };
}

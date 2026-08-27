import "server-only";

import { STREAK_FREEZE_MAX_COUNT } from "@/lib/game/constants";
import { applyExpGain } from "@/lib/game/engine";
import type { ExpGainResult } from "@/lib/game/types";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * `amount`만큼 EXP를 지급한다. 프로필 행이 없으면 만들고(자가 치유 upsert — 회원가입 경로가
 * credentials/Google 두 곳이라 그쪽을 고치는 대신 여기서 항상 보장한다), `FOR UPDATE`로 잠근 뒤
 * 읽고 갱신해 동시 요청 간 레이스 컨디션을 막는다. 같은 트랜잭션 안에서 여러 번 호출해도 안전하다
 * (Postgres는 같은 트랜잭션의 재진입 잠금을 허용한다).
 *
 * 레벨업이 일어난 호출(`leveledUp`)마다 스트릭 프리즈를 1개 지급한다(PROMPT 27.5 — 계획서에
 * 없던 economy를 이 문서가 확정. "판정 지점"은 이 함수의 `applyExpGain` 호출 결과다). 보유
 * 개수가 `STREAK_FREEZE_MAX_COUNT`를 넘으면 초과분은 버려진다.
 *
 * lib/game/grant.ts(액션 EXP)와 lib/quest/service.ts(퀘스트 보상 EXP)가 공유하는 최하위
 * 함수라 별도 파일로 둔다 — grant.ts에 두면 grant.ts ↔ quest/service.ts 순환 참조가 생긴다.
 */
export async function grantExp(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
): Promise<ExpGainResult> {
  await tx.$executeRaw`
    INSERT INTO "UserGameProfile" (user_id, level, exp, current_streak, longest_streak)
    VALUES (${userId}, 1, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING
  `;

  const rows = await tx.$queryRaw<{ level: number; exp: number; streak_freeze_count: number }[]>`
    SELECT level, exp, streak_freeze_count FROM "UserGameProfile" WHERE user_id = ${userId} FOR UPDATE
  `;
  const current = rows[0];

  const result = applyExpGain({ level: current.level, exp: current.exp }, amount);
  const streakFreezeCount = result.leveledUp
    ? Math.min(current.streak_freeze_count + 1, STREAK_FREEZE_MAX_COUNT)
    : current.streak_freeze_count;

  await tx.userGameProfile.update({
    where: { user_id: userId },
    data: { level: result.level, exp: result.exp, streak_freeze_count: streakFreezeCount },
  });

  return result;
}

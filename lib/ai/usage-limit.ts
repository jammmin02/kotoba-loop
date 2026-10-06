import "server-only";

import { getAiUserId } from "@/lib/ai/usage-context";
import {
  evaluateAiLimits,
  type AiUsageLimits,
  type AiUsageSnapshot,
} from "@/lib/ai/usage-limit-policy";
import { ApiError } from "@/lib/api/error";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * 사용자별 AI 호출 한도. 서버리스 인스턴스끼리 메모리를 공유하지 않아 인메모리 카운터는 의미가 없으므로,
 * 이미 모든 호출을 기록하는 AiUsageLog 테이블을 집계해 판정한다(인스턴스와 무관하게 동일한 결과).
 * 호출 직후가 아니라 응답 후에 기록되므로 동시에 쏟아진 요청은 한도를 약간 넘길 수 있다 — 비용 폭주 방지용이지
 * 정확한 과금 장치가 아니다.
 */

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getAiUsageLimits(): AiUsageLimits {
  return {
    perMinuteCalls: envNumber("AI_LIMIT_PER_MINUTE", 15),
    perDayCalls: envNumber("AI_LIMIT_PER_DAY", 300),
    perDayTokens: envNumber("AI_LIMIT_TOKENS_PER_DAY", 500_000),
  };
}

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;

/**
 * 요청 컨텍스트(runWithAiUser)에 사용자가 있을 때 한도를 검사하고, 넘었으면 RATE_LIMITED를 던진다.
 * 사용자 없는 호출(컨텍스트 없음)은 검사하지 않고, 집계 조회가 실패하면 서비스를 막지 않도록 통과시킨다.
 */
export async function enforceAiUsageLimit(): Promise<void> {
  const userId = getAiUserId();
  if (!userId) return;

  const now = Date.now();
  let snapshot: AiUsageSnapshot;
  try {
    const [minuteCalls, day] = await Promise.all([
      db.aiUsageLog.count({
        where: { user_id: userId, created_at: { gte: new Date(now - MINUTE_MS) } },
      }),
      db.aiUsageLog.aggregate({
        where: { user_id: userId, created_at: { gte: new Date(now - DAY_MS) } },
        _count: true,
        _sum: { input_tokens: true, output_tokens: true },
      }),
    ]);
    snapshot = {
      minuteCalls,
      dayCalls: day._count,
      dayTokens: (day._sum.input_tokens ?? 0) + (day._sum.output_tokens ?? 0),
    };
  } catch (err) {
    logger.error("ai-usage-limit", "사용량 조회 실패, 호출 허용", err);
    return;
  }

  const message = evaluateAiLimits(snapshot, getAiUsageLimits());
  if (message) throw new ApiError("RATE_LIMITED", message);
}

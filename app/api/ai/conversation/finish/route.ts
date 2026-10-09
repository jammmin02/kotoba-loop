import {
  generateConversationSummary,
  type ConversationSummaryResult,
  type SummaryTurn,
} from "@/lib/ai/conversation";
import { runWithAiUser } from "@/lib/ai/usage-context";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { COMPOSITION_ACCEPT_SCORE } from "@/lib/composition/config";
import {
  CONVERSATION_DAILY_EXP_SESSION_CAP,
  CONVERSATION_MIN_TURNS_FOR_EXP,
  isConversationScenario,
  resolveConversationExp,
  summarizeConversation,
} from "@/lib/conversation/config";
import {
  loadConversationDetail,
  requireOwnedConversationSession,
} from "@/lib/conversation/session";
import { startOfKstDay } from "@/lib/datetime";
import { db } from "@/lib/db";
import { grantActionExp, type GameProfileGain } from "@/lib/game/grant";
import type { Prisma } from "@/lib/generated/prisma/client";
import { logger } from "@/lib/logger";
import { QUEST_CODES } from "@/lib/quest/constants";
import { conversationSessionRefSchema } from "@/lib/validations/conversation";
import type { ConversationSessionDetail } from "@/types/conversation";

import type { NextRequest } from "next/server";

export interface ConversationFinishResponse {
  detail: ConversationSessionDetail;
  /** 이 종료로 EXP를 받았을 때만. 조건 미달·일일 한도 초과·이미 끝난 세션이면 null. */
  gameProfile: GameProfileGain | null;
}

/**
 * 세션을 종료한다. 총평 AI 호출은 선택 사항이라 실패해도(한도 초과 포함) 종료와 EXP는 진행한다.
 * 종료는 `finished_at IS NULL` 조건부 갱신으로 선점하므로, 더블클릭이나 탭 두 개로 동시에 불러도
 * 총평 저장과 EXP 지급은 한 번만 일어난다.
 */
export const POST = withApiHandler(
  async (req: NextRequest): Promise<ConversationFinishResponse> => {
    const session = await auth();
    if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    const userId = session.user.id;

    const { sessionId } = conversationSessionRefSchema.parse(await req.json());
    const row = await requireOwnedConversationSession(sessionId, userId);

    if (row.finished_at) {
      return { detail: await loadConversationDetail(row.id, userId), gameProfile: null };
    }

    const messages = await db.conversationMessage.findMany({
      where: { session_id: row.id },
      orderBy: { seq: "asc" },
    });
    const scored = messages.filter((m) => m.role === "USER" && m.score !== null);
    const summaryStats = summarizeConversation(messages);

    let summary: ConversationSummaryResult | null = null;
    if (scored.length > 0 && isConversationScenario(row.scenario)) {
      const scenario = row.scenario;
      const turns: SummaryTurn[] = scored.map((m) => {
        const previousAi = messages.findLast((p) => p.role === "AI" && p.seq < m.seq);
        const feedback = m.feedback as { items?: { kind: string }[] } | null;
        return {
          ai: previousAi?.text ?? "",
          user: m.text,
          score: m.score ?? 0,
          feedbackKinds: [...new Set((feedback?.items ?? []).map((i) => i.kind))],
        };
      });
      try {
        summary = await runWithAiUser(userId, () =>
          generateConversationSummary(
            { scenario, topic: row.topic, vocabLevel: row.vocab_level, tone: row.tone },
            turns,
          ),
        );
      } catch (err) {
        logger.warn("conversation-finish", "summary skipped", err);
      }
    }

    const now = new Date();
    const hintUsedTurns = scored.filter((m) => m.hint_used).length;
    const gameProfile = await db.$transaction(async (tx) => {
      const claimed = await tx.conversationSession.updateMany({
        where: { id: row.id, finished_at: null },
        data: {
          finished_at: now,
          summary_comment: summary?.comment ?? null,
          summary_focus: summary?.nextFocus ?? null,
        },
      });
      if (claimed.count === 0) return null;

      const eligible =
        scored.length >= CONVERSATION_MIN_TURNS_FOR_EXP &&
        summaryStats.averageScore >= COMPOSITION_ACCEPT_SCORE;
      if (!eligible) return null;

      const grantedToday = await tx.conversationSession.count({
        where: { user_id: userId, exp_granted: true, finished_at: { gte: startOfKstDay(now) } },
      });
      if (grantedToday >= CONVERSATION_DAILY_EXP_SESSION_CAP) return null;

      await tx.conversationSession.update({ where: { id: row.id }, data: { exp_granted: true } });
      return grantActionExp(
        tx as Prisma.TransactionClient,
        userId,
        resolveConversationExp(scored.length, hintUsedTurns),
        now,
        { [QUEST_CODES.SENTENCE_MAKING]: 1 },
      );
    });

    return { detail: await loadConversationDetail(row.id, userId), gameProfile };
  },
);

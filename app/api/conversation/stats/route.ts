import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { COMPOSITION_VOCAB_LEVELS } from "@/lib/composition/config";
import type { CompositionStats } from "@/lib/composition/stats";
import { CONVERSATION_SCENARIOS } from "@/lib/conversation/config";
import { buildConversationStats } from "@/lib/conversation/stats";
import { db } from "@/lib/db";

/** 통계에 반영하는 최근 발화 수 상한 — 기록이 아주 많아져도 응답 시간이 일정하게 유지된다. */
const STATS_MESSAGE_LIMIT = 500;

export const GET = withApiHandler(async (): Promise<CompositionStats> => {
  const session = await auth();
  if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");

  const rows = await db.conversationMessage.findMany({
    where: { user_id: session.user.id, role: "USER", score: { not: null } },
    orderBy: { created_at: "desc" },
    take: STATS_MESSAGE_LIMIT,
    include: { session: { select: { scenario: true, vocab_level: true, topic: true } } },
  });

  return buildConversationStats(
    rows.map((row) => ({
      created_at: row.created_at,
      score: row.score ?? 0,
      grammar_score: row.grammar_score ?? 0,
      vocabulary_score: row.vocabulary_score ?? 0,
      naturalness_score: row.naturalness_score ?? 0,
      is_accepted: row.is_accepted ?? false,
      hint_used: row.hint_used,
      feedback: row.feedback,
      scenario: row.session.scenario,
      vocab_level: row.session.vocab_level,
      topic: row.session.topic,
    })),
    new Date(),
    { scenarioOrder: CONVERSATION_SCENARIOS, vocabLevelOrder: COMPOSITION_VOCAB_LEVELS },
  );
});

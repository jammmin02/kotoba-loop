import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import {
  COMPOSITION_LEVELS,
  COMPOSITION_SITUATIONS,
  COMPOSITION_VOCAB_LEVELS,
} from "@/lib/composition/config";
import { buildCompositionStats, type CompositionStats } from "@/lib/composition/stats";
import { db } from "@/lib/db";

/** 통계에 반영하는 최근 작문 수 상한 — 기록이 아주 많아져도 응답 시간이 일정하게 유지된다. */
const STATS_ATTEMPT_LIMIT = 500;

export const GET = withApiHandler(async (): Promise<CompositionStats> => {
  const session = await auth();
  if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");

  const rows = await db.compositionAttempt.findMany({
    where: { user_id: session.user.id },
    orderBy: { created_at: "desc" },
    take: STATS_ATTEMPT_LIMIT,
    include: {
      session: { select: { situation: true, vocab_level: true, composition_level: true } },
    },
  });

  return buildCompositionStats(
    rows.map((row) => ({
      created_at: row.created_at,
      score: row.score,
      grammar_score: row.grammar_score,
      vocabulary_score: row.vocabulary_score,
      naturalness_score: row.naturalness_score,
      is_accepted: row.is_accepted,
      hint_used: row.hint_used,
      feedback: row.feedback,
      situation: row.session.situation,
      vocab_level: row.session.vocab_level,
      composition_level: row.session.composition_level,
    })),
    new Date(),
    {
      order: {
        situation: COMPOSITION_SITUATIONS,
        vocabLevel: COMPOSITION_VOCAB_LEVELS,
        compositionLevel: COMPOSITION_LEVELS,
      },
    },
  );
});

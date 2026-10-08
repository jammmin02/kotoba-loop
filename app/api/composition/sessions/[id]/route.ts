import type { CompositionSessionView } from "@/app/api/composition/sessions/route";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { summarizeAttempts, type CompositionSummary } from "@/lib/composition/config";
import { requireOwnedCompositionSession } from "@/lib/composition/session";
import { db } from "@/lib/db";
import type { CompositionAttemptView } from "@/types/composition";

import type { NextRequest } from "next/server";

export interface CompositionSessionDetail {
  session: CompositionSessionView;
  attempts: CompositionAttemptView[];
  summary: CompositionSummary;
}

async function loadDetail(sessionId: string, userId: string): Promise<CompositionSessionDetail> {
  const row = await requireOwnedCompositionSession(sessionId, userId);
  const attempts = await db.compositionAttempt.findMany({
    where: { session_id: row.id },
    orderBy: { order: "asc" },
  });

  return {
    session: {
      id: row.id,
      situation: row.situation,
      vocabLevel: row.vocab_level,
      compositionLevel: row.composition_level,
      tone: row.tone,
      mode: row.mode,
      targetCount: row.target_count,
      createdAt: row.created_at.toISOString(),
      finishedAt: row.finished_at?.toISOString() ?? null,
    },
    attempts: attempts.map((a) => ({
      id: a.id,
      order: a.order,
      promptKorean: a.prompt_korean,
      answerJapanese: a.answer_japanese,
      score: a.score,
      grammarScore: a.grammar_score,
      vocabularyScore: a.vocabulary_score,
      naturalnessScore: a.naturalness_score,
      isAccepted: a.is_accepted,
      hintUsed: a.hint_used,
      feedback: a.feedback as unknown as CompositionAttemptView["feedback"],
    })),
    summary: summarizeAttempts(attempts),
  };
}

export const GET = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/composition/sessions/[id]">,
  ): Promise<CompositionSessionDetail> => {
    const session = await auth();
    if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    const { id } = await ctx.params;
    return loadDetail(id, session.user.id);
  },
);

/** 세션 종료(무한 모드에서 "그만하기", 또는 목표 문항 수 도달 시). 이미 끝난 세션은 그대로 둔다. */
export const PATCH = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/composition/sessions/[id]">,
  ): Promise<CompositionSessionDetail> => {
    const session = await auth();
    if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    const { id } = await ctx.params;
    const row = await requireOwnedCompositionSession(id, session.user.id);

    if (!row.finished_at) {
      await db.compositionSession.update({ where: { id }, data: { finished_at: new Date() } });
    }
    return loadDetail(id, session.user.id);
  },
);

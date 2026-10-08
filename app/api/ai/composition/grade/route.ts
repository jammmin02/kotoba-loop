import { gradeComposition, type CompositionGradeResult } from "@/lib/ai/composition";
import { runWithAiUser } from "@/lib/ai/usage-context";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { COMPOSITION_HINT_EXP, isSessionComplete } from "@/lib/composition/config";
import { requireOwnedCompositionSession } from "@/lib/composition/session";
import { startOfKstDay } from "@/lib/datetime";
import { db } from "@/lib/db";
import { EXP_REWARDS } from "@/lib/game/constants";
import { grantActionExp } from "@/lib/game/grant";
import { Prisma } from "@/lib/generated/prisma/client";
import { QUEST_CODES } from "@/lib/quest/constants";
import { compositionGradeRequestSchema } from "@/lib/validations/composition";
import type { GameProfileGain } from "@/types/game";

import type { NextRequest } from "next/server";

/** EXP 파밍 방지 — 하루에 EXP를 받을 수 있는 정답 작문 수(KST 기준). */
const DAILY_EXP_ATTEMPT_CAP = 10;

export interface CompositionGradeResponse {
  attemptId: string;
  order: number;
  result: CompositionGradeResult;
  /** 이 작문으로 EXP를 받았을 때만. 오답이거나 일일 한도를 넘었으면 null. */
  gameProfile: GameProfileGain | null;
  answeredCount: number;
  /** 목표 문항 수에 도달해 세션이 끝났는지(무한 모드는 항상 false). */
  sessionComplete: boolean;
}

export const POST = withApiHandler(async (req: NextRequest): Promise<CompositionGradeResponse> => {
  const session = await auth();
  if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  const userId = session.user.id;

  const {
    sessionId,
    promptKorean,
    answer,
    hintUsed = false,
  } = compositionGradeRequestSchema.parse(await req.json());
  const row = await requireOwnedCompositionSession(sessionId, userId);
  if (row.finished_at) throw new ApiError("CONFLICT", "이미 끝난 작문 세션이에요.");

  const answeredBefore = await db.compositionAttempt.count({ where: { session_id: row.id } });
  if (isSessionComplete(row.target_count, answeredBefore)) {
    throw new ApiError("CONFLICT", "목표 문제 수를 모두 풀었어요.");
  }

  // AI 호출은 트랜잭션 밖에서 — 오래 걸리는 외부 호출 동안 DB 연결을 잡고 있지 않는다.
  const result = await runWithAiUser(userId, () =>
    gradeComposition(
      {
        situation: row.situation,
        vocabLevel: row.vocab_level,
        compositionLevel: row.composition_level,
        tone: row.tone,
      },
      promptKorean,
      answer,
    ),
  );

  const now = new Date();
  const { attemptId, order, gameProfile } = await db.$transaction(async (tx) => {
    const count = await tx.compositionAttempt.count({ where: { session_id: row.id } });
    const order = count + 1;

    const attempt = await tx.compositionAttempt.create({
      data: {
        session_id: row.id,
        user_id: userId,
        order,
        prompt_korean: promptKorean,
        answer_japanese: answer,
        score: result.score,
        grammar_score: result.grammarScore,
        vocabulary_score: result.vocabularyScore,
        naturalness_score: result.naturalnessScore,
        is_accepted: result.isAccepted,
        hint_used: hintUsed,
        feedback: {
          items: result.feedback,
          modelAnswers: result.modelAnswers,
          comment: result.comment,
        } satisfies Prisma.InputJsonValue,
      },
    });

    let gameProfile: GameProfileGain | null = null;
    if (result.isAccepted) {
      const acceptedToday = await tx.compositionAttempt.count({
        where: {
          user_id: userId,
          is_accepted: true,
          created_at: { gte: startOfKstDay(now) },
        },
      });
      // 방금 만든 시도가 이미 포함돼 있으므로 "한도 이하"일 때만 지급한다.
      if (acceptedToday <= DAILY_EXP_ATTEMPT_CAP) {
        gameProfile = await grantActionExp(
          tx,
          userId,
          hintUsed ? COMPOSITION_HINT_EXP : EXP_REWARDS.SENTENCE_MAKING,
          now,
          {
            [QUEST_CODES.SENTENCE_MAKING]: 1,
          },
        );
      }
    }

    return { attemptId: attempt.id, order, gameProfile };
  });

  const sessionComplete = isSessionComplete(row.target_count, order);
  if (sessionComplete) {
    await db.compositionSession.update({
      where: { id: row.id },
      data: { finished_at: new Date() },
    });
  }

  return { attemptId, order, result, gameProfile, answeredCount: order, sessionComplete };
});

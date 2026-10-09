import { runConversationTurn } from "@/lib/ai/conversation";
import { runWithAiUser } from "@/lib/ai/usage-context";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { isConversationScenario } from "@/lib/conversation/config";
import {
  requireOwnedConversationSession,
  toConversationMessageView,
} from "@/lib/conversation/session";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { conversationTurnRequestSchema } from "@/lib/validations/conversation";
import type { ConversationMessageView } from "@/types/conversation";

import type { NextRequest } from "next/server";

export interface ConversationTurnResponse {
  /** 채점이 붙은 내 발화. */
  userMessage: ConversationMessageView;
  /** 상대의 다음 발화(마지막 턴이면 마무리 인사). */
  aiMessage: ConversationMessageView;
  answeredTurns: number;
  /** 정해진 턴을 모두 말했는지 — true면 "결과 보기"로 종료 처리를 한다. */
  sessionComplete: boolean;
}

/**
 * 내 발화 한 턴을 처리한다. 대화 이력은 DB에서만 읽고(클라이언트 이력은 받지 않는다), 채점과 상대 응답은
 * AI 한 번 호출로 함께 받는다. AI 호출은 트랜잭션 밖에서 하며, 호출이 실패하면 아무것도 저장하지 않아
 * 턴이 소모되지 않는다. (session_id, seq) 유니크 제약이 동시에 들어온 중복 요청을 막는다.
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<ConversationTurnResponse> => {
  const session = await auth();
  if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  const userId = session.user.id;

  const {
    sessionId,
    message,
    hintUsed = false,
  } = conversationTurnRequestSchema.parse(await req.json());
  const row = await requireOwnedConversationSession(sessionId, userId);
  if (row.finished_at) throw new ApiError("CONFLICT", "이미 끝난 회화 세션이에요.");
  if (!isConversationScenario(row.scenario)) {
    throw new ApiError("CONFLICT", "지원하지 않는 회화 상황이에요.");
  }
  const scenario = row.scenario;

  const history = await db.conversationMessage.findMany({
    where: { session_id: row.id },
    orderBy: { seq: "asc" },
    select: { seq: true, role: true, text: true },
  });
  const last = history[history.length - 1];
  if (!last) throw new ApiError("CONFLICT", "대화가 아직 시작되지 않았어요.");
  if (last.role !== "AI") throw new ApiError("CONFLICT", "상대의 답을 기다리는 중이에요.");

  const doneTurns = history.filter((m) => m.role === "USER").length;
  if (doneTurns >= row.target_turns) {
    throw new ApiError("CONFLICT", "정해진 대화 턴을 모두 마쳤어요.");
  }
  const turnNumber = doneTurns + 1;

  const result = await runWithAiUser(userId, () =>
    runConversationTurn({
      settings: {
        scenario,
        topic: row.topic,
        vocabLevel: row.vocab_level,
        tone: row.tone,
      },
      history,
      message,
      turnNumber,
      totalTurns: row.target_turns,
    }),
  );

  try {
    const [userRow, aiRow] = await db.$transaction([
      db.conversationMessage.create({
        data: {
          session_id: row.id,
          user_id: userId,
          seq: last.seq + 1,
          role: "USER",
          text: message,
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
      }),
      db.conversationMessage.create({
        data: {
          session_id: row.id,
          user_id: userId,
          seq: last.seq + 2,
          role: "AI",
          text: result.reply,
          text_ko: result.replyKo,
          hints: result.hints satisfies Prisma.InputJsonValue,
        },
      }),
    ]);

    return {
      userMessage: toConversationMessageView(userRow),
      aiMessage: toConversationMessageView(aiRow),
      answeredTurns: turnNumber,
      sessionComplete: turnNumber >= row.target_turns,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ApiError("CONFLICT", "이미 처리된 턴이에요. 화면을 새로고침해 주세요.");
    }
    throw err;
  }
});

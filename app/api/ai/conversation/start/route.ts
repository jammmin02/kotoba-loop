import { generateConversationOpening } from "@/lib/ai/conversation";
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
import { conversationSessionRefSchema } from "@/lib/validations/conversation";
import type { ConversationMessageView } from "@/types/conversation";

import type { NextRequest } from "next/server";

export interface ConversationStartResponse {
  message: ConversationMessageView;
}

/** 상대(AI)의 첫 발화를 만든다. 이미 대화가 시작된 세션이면 거절한다. */
export const POST = withApiHandler(async (req: NextRequest): Promise<ConversationStartResponse> => {
  const session = await auth();
  if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  const userId = session.user.id;

  const { sessionId } = conversationSessionRefSchema.parse(await req.json());
  const row = await requireOwnedConversationSession(sessionId, userId);
  if (row.finished_at) throw new ApiError("CONFLICT", "이미 끝난 회화 세션이에요.");
  if (!isConversationScenario(row.scenario)) {
    throw new ApiError("CONFLICT", "지원하지 않는 회화 상황이에요.");
  }
  const scenario = row.scenario;

  if ((await db.conversationMessage.count({ where: { session_id: row.id } })) > 0) {
    throw new ApiError("CONFLICT", "이미 대화가 시작됐어요.");
  }

  const opening = await runWithAiUser(userId, () =>
    generateConversationOpening({
      scenario,
      topic: row.topic,
      vocabLevel: row.vocab_level,
      tone: row.tone,
    }),
  );

  try {
    const created = await db.conversationMessage.create({
      data: {
        session_id: row.id,
        user_id: userId,
        seq: 1,
        role: "AI",
        text: opening.reply,
        text_ko: opening.replyKo,
        hints: opening.hints satisfies Prisma.InputJsonValue,
      },
    });
    return { message: toConversationMessageView(created) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ApiError("CONFLICT", "이미 대화가 시작됐어요.");
    }
    throw err;
  }
});

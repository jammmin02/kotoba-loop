import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { pickTopic, summarizeConversation } from "@/lib/conversation/config";
import { toConversationSessionView } from "@/lib/conversation/session";
import { db } from "@/lib/db";
import { createConversationSessionSchema } from "@/lib/validations/conversation";
import type { ConversationSessionView } from "@/types/conversation";

import type { NextRequest } from "next/server";

export interface ConversationSessionListItem extends ConversationSessionView {
  answeredCount: number;
  averageScore: number;
}

const HISTORY_LIMIT = 10;

/** 세션을 만든다. 세부 상황(가게 종류 등)은 서버가 무작위로 정하며 클라이언트가 고를 수 없다. */
export const POST = withApiHandler(async (req: NextRequest): Promise<ConversationSessionView> => {
  const session = await auth();
  if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");

  const input = createConversationSessionSchema.parse(await req.json());

  const created = await db.conversationSession.create({
    data: {
      user_id: session.user.id,
      scenario: input.scenario,
      topic: pickTopic(input.scenario).label,
      vocab_level: input.vocabLevel,
      tone: input.tone,
      target_turns: input.targetTurns,
    },
  });

  return toConversationSessionView(created);
});

/** 최근 회화 세션 목록(기록 화면용) — 한 번이라도 말한 세션만. */
export const GET = withApiHandler(async (): Promise<ConversationSessionListItem[]> => {
  const session = await auth();
  if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");

  const rows = await db.conversationSession.findMany({
    where: { user_id: session.user.id, messages: { some: { role: "USER" } } },
    orderBy: { created_at: "desc" },
    take: HISTORY_LIMIT,
    include: {
      messages: {
        where: { role: "USER" },
        select: {
          score: true,
          grammar_score: true,
          vocabulary_score: true,
          naturalness_score: true,
          is_accepted: true,
        },
      },
    },
  });

  return rows.map(({ messages, ...row }) => {
    const summary = summarizeConversation(messages);
    return {
      ...toConversationSessionView(row),
      answeredCount: summary.answeredCount,
      averageScore: summary.averageScore,
    };
  });
});

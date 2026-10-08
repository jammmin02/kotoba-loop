import "server-only";

import { ApiError } from "@/lib/api/error";
import { summarizeConversation } from "@/lib/conversation/config";
import { db } from "@/lib/db";
import type { ConversationMessage, ConversationSession } from "@/lib/generated/prisma/client";
import type {
  ConversationMessageView,
  ConversationSessionDetail,
  ConversationSessionView,
} from "@/types/conversation";

/** 본인 소유 세션만 돌려준다. 남의 세션은 존재 여부를 숨기려고 같은 NOT_FOUND로 응답한다. */
export async function requireOwnedConversationSession(sessionId: string, userId: string) {
  const found = await db.conversationSession.findFirst({
    where: { id: sessionId, user_id: userId },
  });
  if (!found) throw new ApiError("NOT_FOUND", "회화 세션을 찾을 수 없습니다.");
  return found;
}

export function toConversationSessionView(row: ConversationSession): ConversationSessionView {
  return {
    id: row.id,
    scenario: row.scenario,
    topic: row.topic,
    vocabLevel: row.vocab_level,
    tone: row.tone,
    targetTurns: row.target_turns,
    createdAt: row.created_at.toISOString(),
    finishedAt: row.finished_at?.toISOString() ?? null,
    summaryComment: row.summary_comment,
    summaryFocus: row.summary_focus,
  };
}

export function toConversationMessageView(row: ConversationMessage): ConversationMessageView {
  const feedback = row.feedback as unknown as
    NonNullable<ConversationMessageView["grade"]>["feedback"] | null;
  return {
    id: row.id,
    seq: row.seq,
    role: row.role,
    text: row.text,
    textKo: row.text_ko,
    hints: (row.hints as unknown as ConversationMessageView["hints"] | null) ?? [],
    hintUsed: row.hint_used,
    grade:
      row.role === "USER" && row.score !== null && feedback
        ? {
            score: row.score,
            grammarScore: row.grammar_score ?? 0,
            vocabularyScore: row.vocabulary_score ?? 0,
            naturalnessScore: row.naturalness_score ?? 0,
            isAccepted: row.is_accepted ?? false,
            feedback,
          }
        : null,
  };
}

export async function loadConversationDetail(
  sessionId: string,
  userId: string,
): Promise<ConversationSessionDetail> {
  const row = await requireOwnedConversationSession(sessionId, userId);
  const messages = await db.conversationMessage.findMany({
    where: { session_id: row.id },
    orderBy: { seq: "asc" },
  });
  return {
    session: toConversationSessionView(row),
    messages: messages.map(toConversationMessageView),
    summary: summarizeConversation(messages),
  };
}

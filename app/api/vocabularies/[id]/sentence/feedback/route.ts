import { correctSentence } from "@/lib/ai/sentence-correction";
import type { SentenceCorrectionResult } from "@/lib/ai/sentence-correction";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireOwnedVocabulary } from "@/lib/vocabulary-ownership";

import type { NextRequest } from "next/server";

export interface SentenceFeedbackResponse {
  cached: boolean;
  result: SentenceCorrectionResult;
}

/**
 * PROMPT 20-A: 저장된 문장(PROMPT 20, `POST /sentence`)에 대한 AI 첨삭만 별도로 담당한다.
 * 저장 API와 완전히 분리해둔 이유: 첨삭이 실패해도 이미 저장된 문장과 지급된 EXP는 그대로
 * 유지되어야 하기 때문(로드맵 PROMPT 20-A "AI 실패 시" 요구사항) — 같은 트랜잭션에 묶으면
 * AI 실패가 저장 자체를 실패시킬 위험이 생긴다. 클라이언트가 보낸 문장이 아니라 실제로
 * 저장된 `UserSentence`를 대상으로 첨삭하므로, 저장 없이 임의 텍스트로 AI를 호출할 수 없다.
 */
export const POST = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/vocabularies/[id]/sentence/feedback">,
  ): Promise<SentenceFeedbackResponse> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    const userId = session.user.id;

    await requireOwnedVocabulary(id, userId);

    const [vocabulary, userSentence] = await Promise.all([
      db.vocabulary.findUnique({ where: { id }, select: { word: true } }),
      db.userSentence.findUnique({
        where: { user_id_vocabulary_id: { user_id: userId, vocabulary_id: id } },
      }),
    ]);

    if (!vocabulary || !userSentence) {
      throw new ApiError("NOT_FOUND", "저장된 문장을 찾을 수 없습니다.");
    }

    const { cached, result } = await correctSentence(id, vocabulary.word, userSentence.sentence, userId);
    return { cached, result };
  },
);

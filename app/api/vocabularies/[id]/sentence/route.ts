import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EXP_REWARDS } from "@/lib/game/constants";
import { grantActionExp } from "@/lib/game/grant";
import { QUEST_CODES } from "@/lib/quest/constants";
import { sentenceSubmitSchema } from "@/lib/validations/sentence";
import { requireOwnedVocabulary } from "@/lib/vocabulary-ownership";
import type { GameProfileGain } from "@/types/game";

import type { NextRequest } from "next/server";

export interface SentenceSubmitResponse {
  sentence: string;
  gameProfile: GameProfileGain;
}

/**
 * "문장 만들기"(+3 EXP) — 단어당 사용자가 저장한 문장 1개. 최초 저장에만 EXP를 지급하고,
 * 같은 단어에 다시 저장(수정)해도 재지급하지 않는다(무한 EXP 파밍 방지).
 */
export const POST = withApiHandler(
  async (
    req: NextRequest,
    ctx: RouteContext<"/api/vocabularies/[id]/sentence">,
  ): Promise<SentenceSubmitResponse> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    const { sentence } = sentenceSubmitSchema.parse(await req.json());
    const userId = session.user.id;
    const now = new Date();

    const gameProfile = await db.$transaction(async (tx) => {
      await requireOwnedVocabulary(id, userId, tx);

      const existing = await tx.userSentence.findUnique({
        where: { user_id_vocabulary_id: { user_id: userId, vocabulary_id: id } },
      });

      if (existing) {
        await tx.userSentence.update({
          where: { user_id_vocabulary_id: { user_id: userId, vocabulary_id: id } },
          data: { sentence },
        });
        return grantActionExp(tx, userId, 0, now);
      }

      await tx.userSentence.create({
        data: { user_id: userId, vocabulary_id: id, sentence },
      });
      return grantActionExp(tx, userId, EXP_REWARDS.SENTENCE_MAKING, now, {
        [QUEST_CODES.SENTENCE_MAKING]: 1,
      });
    });

    return { sentence, gameProfile };
  },
);

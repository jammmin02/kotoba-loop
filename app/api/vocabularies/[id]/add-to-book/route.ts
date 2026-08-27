import { checkWordRegisterAchievements } from "@/lib/achievement/service";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addVocabularyToBookSchema } from "@/lib/validations/vocabulary";
import type { AddToBookResult } from "@/types/vocabulary";

import type { NextRequest } from "next/server";

/**
 * 한자 상세 페이지의 "대표 단어"처럼, 내가 등록한 적 없는(다른 사용자 것이거나 아무에게도
 * 속하지 않은) 기존 Vocabulary를 내 단어장에 추가한다. `POST /api/vocabularies`는 항상 새
 * Vocabulary를 만들기 때문에(단어 재사용/공유 개념이 없다) 이미 있는 단어를 그대로 연결하려면
 * 이 엔드포인트가 필요하다. 이미 내가 등록한 단어라면 UserVocabulary는 건드리지 않고 선택한
 * 단어장에만 추가한다(idempotent, 업적도 다시 판정하지 않는다).
 */
export const POST = withApiHandler(
  async (
    req: NextRequest,
    ctx: RouteContext<"/api/vocabularies/[id]/add-to-book">,
  ): Promise<AddToBookResult> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;

    const body = await req.json();
    const { vocabularyBookIds } = addVocabularyToBookSchema.parse(body);

    const vocabulary = await db.vocabulary.findUnique({ where: { id }, select: { id: true } });
    if (!vocabulary) {
      throw new ApiError("NOT_FOUND", "단어를 찾을 수 없습니다.");
    }

    const ownedBookCount = await db.vocabularyBook.count({
      where: { id: { in: vocabularyBookIds }, user_id: session.user.id },
    });
    if (ownedBookCount !== vocabularyBookIds.length) {
      throw new ApiError("VALIDATION_ERROR", "선택한 단어장 중 접근할 수 없는 항목이 있습니다.");
    }

    const { alreadyOwned, unlockedAchievements } = await db.$transaction(async (tx) => {
      const existing = await tx.userVocabulary.findUnique({
        where: { user_id_vocabulary_id: { user_id: session.user.id, vocabulary_id: id } },
      });

      if (!existing) {
        await tx.userVocabulary.create({
          data: { user_id: session.user.id, vocabulary_id: id, learning_status: "NEW" },
        });
      }

      await tx.vocabularyBookItem.createMany({
        data: vocabularyBookIds.map((bookId) => ({
          vocabulary_book_id: bookId,
          vocabulary_id: id,
        })),
        skipDuplicates: true,
      });

      return {
        alreadyOwned: !!existing,
        unlockedAchievements: existing ? [] : await checkWordRegisterAchievements(tx, session.user.id),
      };
    });

    return { vocabularyId: id, addedBookIds: vocabularyBookIds, alreadyOwned, unlockedAchievements };
  },
);

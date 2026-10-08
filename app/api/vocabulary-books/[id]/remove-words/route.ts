import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bulkDeleteSchema } from "@/lib/validations/vocabulary";

import type { NextRequest } from "next/server";

export interface RemoveWordsResponse {
  /** 이 단어장에서 뺀 단어 수(삭제된 단어 포함). */
  removedCount: number;
  /** 그중 다른 어느 단어장에도 없어 단어 자체까지 삭제된 수. */
  deletedCount: number;
}

/**
 * 선택한 단어를 이 단어장에서 뺀다. 같은 단어가 다른 단어장에도 있으면 그쪽은 그대로 두고,
 * 어느 단어장에도 남지 않게 된 단어만 단어 자체(뜻/예문/학습 기록 포함, DB cascade)를 삭제한다.
 * 이 단어장에 없는 id는 조용히 무시한다.
 */
export const POST = withApiHandler(
  async (
    req: NextRequest,
    ctx: RouteContext<"/api/vocabulary-books/[id]/remove-words">,
  ): Promise<RemoveWordsResponse> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id: bookId } = await ctx.params;
    const book = await db.vocabularyBook.findUnique({ where: { id: bookId } });
    if (!book || book.user_id !== session.user.id) {
      throw new ApiError("NOT_FOUND", "단어장을 찾을 수 없습니다.");
    }

    const { ids } = bulkDeleteSchema.parse(await req.json());

    return db.$transaction(async (tx) => {
      // 이 사용자의 이 단어장에 실제로 들어 있는 단어만 대상으로 삼는다(소유권 검증을 겸한다).
      const inBook = await tx.vocabularyBookItem.findMany({
        where: { vocabulary_book_id: bookId, vocabulary_id: { in: [...new Set(ids)] } },
        select: { vocabulary_id: true },
      });
      const targetIds = inBook.map((item) => item.vocabulary_id);
      if (targetIds.length === 0) return { removedCount: 0, deletedCount: 0 };

      await tx.vocabularyBookItem.deleteMany({
        where: { vocabulary_book_id: bookId, vocabulary_id: { in: targetIds } },
      });

      const stillInOtherBooks = await tx.vocabularyBookItem.findMany({
        where: { vocabulary_id: { in: targetIds } },
        select: { vocabulary_id: true },
      });
      const kept = new Set(stillInOtherBooks.map((item) => item.vocabulary_id));
      const orphanIds = targetIds.filter((vocabularyId) => !kept.has(vocabularyId));
      if (orphanIds.length > 0) {
        await tx.vocabulary.deleteMany({ where: { id: { in: orphanIds } } });
      }

      return { removedCount: targetIds.length, deletedCount: orphanIds.length };
    });
  },
);

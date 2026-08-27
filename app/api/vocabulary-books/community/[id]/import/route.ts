import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

import type { NextRequest } from "next/server";

/**
 * Clones a public book into a new book owned by the caller. Only the
 * VocabularyBookItem links are duplicated — Vocabulary rows are shared
 * global dictionary entries (same principle as the existing "add word to
 * book" flow), so the copy has its own item rows from the start and later
 * edits to the source book's items never propagate to it.
 */
export const POST = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/vocabulary-books/community/[id]/import">,
  ): Promise<VocabularyBookSummary> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;

    const source = await db.vocabularyBook.findUnique({
      where: { id },
      include: { items: { select: { vocabulary_id: true } } },
    });

    if (!source || !source.is_public) {
      throw new ApiError("NOT_FOUND", "단어장을 찾을 수 없습니다.");
    }

    const newBook = await db.$transaction(async (tx) => {
      const book = await tx.vocabularyBook.create({
        data: {
          user_id: session.user.id,
          name: source.name,
          description: source.description,
          is_public: false,
        },
      });

      if (source.items.length > 0) {
        await tx.vocabularyBookItem.createMany({
          data: source.items.map((item) => ({
            vocabulary_book_id: book.id,
            vocabulary_id: item.vocabulary_id,
          })),
        });
      }

      await tx.vocabularyBook.update({
        where: { id: source.id },
        data: { import_count: { increment: 1 } },
      });

      return book;
    });

    return {
      id: newBook.id,
      name: newBook.name,
      description: newBook.description,
      isPublic: newBook.is_public,
      createdAt: formatKstISOString(newBook.created_at),
      wordCount: source.items.length,
      masteredCount: 0,
    };
  },
);

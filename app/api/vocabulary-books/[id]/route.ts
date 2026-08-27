import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { updateVocabularyBookSchema } from "@/lib/validations/vocabulary-book";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

import type { NextRequest } from "next/server";

/**
 * Returns the book only when it belongs to `userId`; 404s either way it
 * doesn't (missing or someone else's) so ownership can't be probed from
 * the outside.
 */
async function requireOwnedBook(id: string, userId: string) {
  const book = await db.vocabularyBook.findUnique({ where: { id } });
  if (!book || book.user_id !== userId) {
    throw new ApiError("NOT_FOUND", "단어장을 찾을 수 없습니다.");
  }
  return book;
}

export const PATCH = withApiHandler(
  async (req: NextRequest, ctx: RouteContext<"/api/vocabulary-books/[id]">): Promise<VocabularyBookSummary> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    await requireOwnedBook(id, session.user.id);

    const body = await req.json();
    const { name, description, isPublic } = updateVocabularyBookSchema.parse(body);

    const book = await db.vocabularyBook.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(isPublic !== undefined && { is_public: isPublic }),
      },
      include: { _count: { select: { items: true } } },
    });

    const masteredCount = await db.userVocabulary.count({
      where: {
        user_id: session.user.id,
        learning_status: "MASTERED",
        vocabulary: { bookItems: { some: { vocabulary_book_id: id } } },
      },
    });

    return {
      id: book.id,
      name: book.name,
      description: book.description,
      isPublic: book.is_public,
      createdAt: formatKstISOString(book.created_at),
      wordCount: book._count.items,
      masteredCount,
    };
  },
);

export const DELETE = withApiHandler(
  async (_req: NextRequest, ctx: RouteContext<"/api/vocabulary-books/[id]">): Promise<{ id: string }> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    await requireOwnedBook(id, session.user.id);

    // Deleting a book only removes its VocabularyBookItem links (cascade).
    // Words and their UserVocabulary/ReviewHistory progress are intentionally
    // preserved even when a word ends up unlinked from every book — this
    // matches what the delete-confirmation UI promises the user
    // (components/vocabulary/delete-vocabulary-book-modal.tsx). Word deletion
    // is only available via the explicit single-word delete endpoint
    // (app/api/vocabularies/[id]/route.ts).
    await db.vocabularyBook.delete({ where: { id } });

    return { id };
  },
);

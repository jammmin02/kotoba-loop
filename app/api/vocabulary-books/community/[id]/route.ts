import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import type { CommunityBookDetail } from "@/types/community";

import type { NextRequest } from "next/server";

/**
 * 404s for both a missing book and a private book someone else owns, so
 * privacy can't be probed from the outside (same pattern as
 * requireOwnedBook in app/api/vocabulary-books/[id]/route.ts).
 */
export const GET = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/vocabulary-books/community/[id]">,
  ): Promise<CommunityBookDetail> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;

    const book = await db.vocabularyBook.findUnique({
      where: { id },
      include: {
        user: { select: { nickname: true } },
        _count: { select: { items: true } },
        items: {
          select: {
            vocabulary: {
              select: {
                id: true,
                word: true,
                reading: true,
                meanings: { select: { meaning: true } },
              },
            },
          },
        },
      },
    });

    if (!book || (!book.is_public && book.user_id !== session.user.id)) {
      throw new ApiError("NOT_FOUND", "단어장을 찾을 수 없습니다.");
    }

    return {
      id: book.id,
      name: book.name,
      description: book.description,
      ownerNickname: book.user.nickname,
      wordCount: book._count.items,
      importCount: book.import_count,
      createdAt: formatKstISOString(book.created_at),
      isOwner: book.user_id === session.user.id,
      words: book.items.map((item) => ({
        id: item.vocabulary.id,
        word: item.vocabulary.word,
        reading: item.vocabulary.reading,
        meanings: item.vocabulary.meanings.map((m) => m.meaning),
      })),
    };
  },
);

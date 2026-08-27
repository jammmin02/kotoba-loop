import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { LearningStatus } from "@/lib/generated/prisma/client";
import { createVocabularyBookSchema } from "@/lib/validations/vocabulary-book";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(async (): Promise<VocabularyBookSummary[]> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const books = await db.vocabularyBook.findMany({
    where: { user_id: session.user.id },
    orderBy: { created_at: "desc" },
    include: {
      _count: { select: { items: true } },
      items: {
        select: {
          vocabulary: {
            select: {
              userVocabularies: {
                where: { user_id: session.user.id },
                select: { learning_status: true },
              },
            },
          },
        },
      },
    },
  });

  return books.map((book) => ({
    id: book.id,
    name: book.name,
    description: book.description,
    isPublic: book.is_public,
    createdAt: formatKstISOString(book.created_at),
    wordCount: book._count.items,
    masteredCount: book.items.filter(
      (item) => item.vocabulary.userVocabularies[0]?.learning_status === LearningStatus.MASTERED,
    ).length,
  }));
});

export const POST = withApiHandler(async (req: NextRequest): Promise<VocabularyBookSummary> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const body = await req.json();
  const { name, description, isPublic } = createVocabularyBookSchema.parse(body);

  const book = await db.vocabularyBook.create({
    data: {
      user_id: session.user.id,
      name,
      description: description || null,
      is_public: isPublic ?? false,
    },
  });

  return {
    id: book.id,
    name: book.name,
    description: book.description,
    isPublic: book.is_public,
    createdAt: formatKstISOString(book.created_at),
    wordCount: 0,
    masteredCount: 0,
  };
});

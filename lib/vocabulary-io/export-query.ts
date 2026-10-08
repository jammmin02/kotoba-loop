import { ApiError } from "@/lib/api/error";
import { formatKstISOString } from "@/lib/datetime";
import type { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

import { IMPORT_MAX_ROWS } from "./schema";

import type { ExportBook, ExportWord } from "./export";

type Client = typeof db | Prisma.TransactionClient;

/**
 * 내보낼 단어와 단어장을 읽는다. `bookId`를 주면 그 단어장의 단어만, 없으면 내 모든 단어다.
 * 다시 가져올 수 없는 큰 파일이 만들어지지 않도록, 가져오기 한도를 넘으면 잘라 보내지 않고 오류로 알린다.
 */
export async function loadExportData(
  client: Client,
  userId: string,
  bookId?: string,
): Promise<{ words: ExportWord[]; books: ExportBook[] }> {
  if (bookId) {
    const book = await client.vocabularyBook.findUnique({ where: { id: bookId } });
    if (!book || book.user_id !== userId) {
      throw new ApiError("NOT_FOUND", "단어장을 찾을 수 없습니다.");
    }
  }

  const wordFilter = {
    user_id: userId,
    ...(bookId && { vocabulary: { bookItems: { some: { vocabulary_book_id: bookId } } } }),
  };
  const total = await client.userVocabulary.count({ where: wordFilter });
  if (total > IMPORT_MAX_ROWS) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `내보낼 단어가 너무 많아요(${total}개). 한 번에 ${IMPORT_MAX_ROWS.toLocaleString()}개까지 내보낼 수 있으니 단어장별로 나눠 받아주세요.`,
    );
  }

  // 같은 단어 행을 다른 사용자도 쓸 수 있으므로(커뮤니티 가져오기), 태그와 단어장은 내 것만 담는다.
  const ownBook = { user_id: userId, ...(bookId && { id: bookId }) };
  const rows = await client.userVocabulary.findMany({
    where: wordFilter,
    orderBy: { vocabulary: { created_at: "asc" } },
    include: {
      vocabulary: {
        include: {
          meanings: { select: { meaning: true } },
          examples: { select: { japanese: true, korean: true } },
          tags: {
            where: { tag: { user_id: userId } },
            select: { tag: { select: { name: true } } },
          },
          bookItems: { where: { book: ownBook }, select: { book: { select: { name: true } } } },
        },
      },
    },
  });

  const words: ExportWord[] = rows.map((row) => ({
    word: row.vocabulary.word,
    reading: row.vocabulary.reading,
    partOfSpeech: row.vocabulary.part_of_speech,
    jlptLevel: row.vocabulary.jlpt_level,
    meanings: row.vocabulary.meanings.map((item) => item.meaning),
    examples: row.vocabulary.examples,
    tags: row.vocabulary.tags.map((item) => item.tag.name),
    isFavorite: row.is_favorite,
    bookNames: [...new Set(row.vocabulary.bookItems.map((item) => item.book.name))],
    progress: {
      learningStatus: row.learning_status,
      intervalStage: row.interval_stage,
      nextReviewAt: row.next_review_at ? formatKstISOString(row.next_review_at) : null,
      lastReviewedAt: row.last_reviewed_at ? formatKstISOString(row.last_reviewed_at) : null,
      correctCount: row.correct_count,
      wrongCount: row.wrong_count,
    },
  }));

  const books: ExportBook[] = (
    await client.vocabularyBook.findMany({ where: ownBook, orderBy: { created_at: "asc" } })
  ).map((book) => ({
    name: book.name,
    description: book.description,
    isPublic: book.is_public,
    color: book.color,
  }));

  return { words, books };
}

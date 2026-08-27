import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { escapeLikePattern, normalizeSearchQuery } from "@/lib/search";
import { searchQuerySchema } from "@/lib/validations/search";
import { JLPT_LEVEL_OPTIONS } from "@/lib/validations/vocabulary";
import type { SearchResponse } from "@/types/search";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(async (req: NextRequest): Promise<SearchResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { q, page, pageSize } = searchQuerySchema.parse({
    q: req.nextUrl.searchParams.get("q") ?? undefined,
    page: req.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: req.nextUrl.searchParams.get("pageSize") ?? undefined,
  });

  const normalized = normalizeSearchQuery(q);
  const pattern = escapeLikePattern(normalized);
  const upperQ = normalized.toUpperCase();
  const jlptMatch = (JLPT_LEVEL_OPTIONS as readonly string[]).includes(upperQ)
    ? (upperQ as (typeof JLPT_LEVEL_OPTIONS)[number])
    : undefined;

  const where = {
    userVocabularies: { some: { user_id: session.user.id } },
    OR: [
      { word: { contains: pattern, mode: "insensitive" as const } },
      { reading: { contains: pattern, mode: "insensitive" as const } },
      { part_of_speech: { contains: pattern, mode: "insensitive" as const } },
      { meanings: { some: { meaning: { contains: pattern, mode: "insensitive" as const } } } },
      { tags: { some: { tag: { name: { contains: pattern, mode: "insensitive" as const } } } } },
      ...(jlptMatch ? [{ jlpt_level: jlptMatch }] : []),
    ],
  };

  const [total, vocabularies] = await Promise.all([
    db.vocabulary.count({ where }),
    db.vocabulary.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        meanings: { select: { meaning: true } },
        userVocabularies: {
          where: { user_id: session.user.id },
          select: { learning_status: true, is_favorite: true },
        },
        bookItems: { select: { vocabulary_book_id: true } },
        tags: { select: { tag: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  const items = vocabularies.map((vocabulary) => ({
    id: vocabulary.id,
    word: vocabulary.word,
    reading: vocabulary.reading,
    partOfSpeech: vocabulary.part_of_speech,
    jlptLevel: vocabulary.jlpt_level,
    learningStatus: vocabulary.userVocabularies[0]?.learning_status ?? "NEW",
    meanings: vocabulary.meanings.map((m) => m.meaning),
    bookIds: vocabulary.bookItems.map((item) => item.vocabulary_book_id),
    isFavorite: vocabulary.userVocabularies[0]?.is_favorite ?? false,
    tags: vocabulary.tags.map((t) => t.tag),
    createdAt: formatKstISOString(vocabulary.created_at),
  }));

  return {
    query: q,
    vocabularies: {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    kanji: [],
  };
});

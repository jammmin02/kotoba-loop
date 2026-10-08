import { checkWordRegisterAchievements } from "@/lib/achievement/service";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { vocabularyCreateSchema, vocabularyListQuerySchema } from "@/lib/validations/vocabulary";
import { createVocabularyRecord } from "@/lib/vocabulary-create";
import type { VocabularySummary } from "@/types/vocabulary";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(async (req: NextRequest): Promise<VocabularySummary[]> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { bookId, bookIds, status, tagId, favorite } = vocabularyListQuerySchema.parse({
    bookId: req.nextUrl.searchParams.get("bookId") ?? undefined,
    bookIds: req.nextUrl.searchParams.get("bookIds") ?? undefined,
    status: req.nextUrl.searchParams.get("status") ?? undefined,
    tagId: req.nextUrl.searchParams.get("tagId") ?? undefined,
    favorite: req.nextUrl.searchParams.get("favorite") ?? undefined,
  });

  const vocabularies = await db.vocabulary.findMany({
    where: {
      userVocabularies: {
        some: {
          user_id: session.user.id,
          ...(status && { learning_status: status }),
          ...(favorite && { is_favorite: true }),
        },
      },
      ...(bookId && { bookItems: { some: { vocabulary_book_id: bookId } } }),
      ...(bookIds && { bookItems: { some: { vocabulary_book_id: { in: bookIds } } } }),
      ...(tagId && { tags: { some: { tag_id: tagId } } }),
    },
    orderBy: { created_at: "desc" },
    include: {
      meanings: { select: { meaning: true } },
      userVocabularies: {
        where: { user_id: session.user.id },
        select: {
          learning_status: true,
          is_favorite: true,
          next_review_at: true,
          interval_stage: true,
        },
      },
      bookItems: { select: { vocabulary_book_id: true } },
      tags: { select: { tag: { select: { id: true, name: true } } } },
    },
  });

  return vocabularies.map((vocabulary) => ({
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
    nextReviewAt: vocabulary.userVocabularies[0]?.next_review_at
      ? formatKstISOString(vocabulary.userVocabularies[0].next_review_at)
      : null,
    intervalStage: vocabulary.userVocabularies[0]?.interval_stage ?? 0,
  }));
});

export const POST = withApiHandler(async (req: NextRequest): Promise<VocabularySummary> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const input = vocabularyCreateSchema.parse(await req.json());
  const { vocabularyBookIds, meanings } = input;

  const ownedBookCount = await db.vocabularyBook.count({
    where: { id: { in: vocabularyBookIds }, user_id: session.user.id },
  });
  if (ownedBookCount !== vocabularyBookIds.length) {
    throw new ApiError("VALIDATION_ERROR", "선택한 단어장 중 접근할 수 없는 항목이 있습니다.");
  }

  const { vocabulary, unlockedAchievements } = await db.$transaction(async (tx) => {
    const created = await createVocabularyRecord(tx, session.user.id, input);
    // 업적(PROMPT 27): "첫 단어 등록"은 학습이 아니라 등록 시점 조건이라 EXP 지급 경로
    // (grantActionExp)가 아니라 여기서 직접 체크한다.
    const unlockedAchievements = await checkWordRegisterAchievements(tx, session.user.id);
    return { vocabulary: created, unlockedAchievements };
  });

  return {
    id: vocabulary.id,
    word: vocabulary.word,
    reading: vocabulary.reading,
    partOfSpeech: vocabulary.part_of_speech,
    jlptLevel: vocabulary.jlpt_level,
    learningStatus: "NEW",
    meanings,
    bookIds: vocabularyBookIds,
    isFavorite: false,
    tags: [],
    createdAt: formatKstISOString(vocabulary.created_at),
    unlockedAchievements,
  };
});

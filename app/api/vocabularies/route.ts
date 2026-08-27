import { checkWordRegisterAchievements } from "@/lib/achievement/service";
import { WORD_ANALYSIS_TYPE } from "@/lib/ai/word-analysis";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { vocabularyCreateSchema, vocabularyListQuerySchema } from "@/lib/validations/vocabulary";
import { syncVocabularyKanji } from "@/lib/vocabulary-kanji";
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
        select: { learning_status: true, is_favorite: true },
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
  }));
});

export const POST = withApiHandler(async (req: NextRequest): Promise<VocabularySummary> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const body = await req.json();
  const {
    word,
    reading,
    partOfSpeech,
    jlptLevel,
    meanings,
    examples,
    vocabularyBookIds,
    aiAnalysisId,
    aiFieldsEdited,
  } = vocabularyCreateSchema.parse(body);

  const ownedBookCount = await db.vocabularyBook.count({
    where: { id: { in: vocabularyBookIds }, user_id: session.user.id },
  });
  if (ownedBookCount !== vocabularyBookIds.length) {
    throw new ApiError("VALIDATION_ERROR", "선택한 단어장 중 접근할 수 없는 항목이 있습니다.");
  }

  const { vocabulary, unlockedAchievements } = await db.$transaction(async (tx) => {
    const created = await tx.vocabulary.create({
      data: {
        word,
        reading,
        part_of_speech: partOfSpeech,
        jlpt_level: jlptLevel,
        meanings: { create: meanings.map((meaning) => ({ meaning })) },
        examples: {
          create: examples.map((example) => ({
            japanese: example.japanese,
            korean: example.korean,
          })),
        },
        bookItems: { create: vocabularyBookIds.map((bookId) => ({ vocabulary_book_id: bookId })) },
      },
    });
    await tx.userVocabulary.create({
      data: { user_id: session.user.id, vocabulary_id: created.id, learning_status: "NEW" },
    });
    await syncVocabularyKanji(tx, created.id, word);
    if (aiAnalysisId) {
      // Best-effort: an unknown/foreign id just updates 0 rows, never fails the save.
      await tx.aIAnalysis.updateMany({
        where: { id: aiAnalysisId, user_id: session.user.id, analysis_type: WORD_ANALYSIS_TYPE },
        data: { status: aiFieldsEdited ? "edited" : "confirmed" },
      });
    }
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

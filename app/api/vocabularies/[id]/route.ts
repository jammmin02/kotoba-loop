import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { vocabularySchema } from "@/lib/validations/vocabulary";
import { syncVocabularyKanji } from "@/lib/vocabulary-kanji";
import { requireOwnedVocabulary } from "@/lib/vocabulary-ownership";
import type { RelatedExpressionRecord, VocabularyDetail } from "@/types/vocabulary";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/vocabularies/[id]">,
  ): Promise<VocabularyDetail> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    const userVocabulary = await requireOwnedVocabulary(id, session.user.id);

    const vocabulary = await db.vocabulary.findUniqueOrThrow({
      where: { id },
      include: {
        meanings: { select: { meaning: true } },
        examples: { select: { japanese: true, korean: true } },
        relatedExpressions: {
          orderBy: { order: "asc" },
          select: { id: true, relation_type: true, expression: true, meaning: true },
        },
        bookItems: { select: { vocabulary_book_id: true } },
        tags: { select: { tag: { select: { id: true, name: true } } } },
      },
    });

    return {
      id: vocabulary.id,
      word: vocabulary.word,
      reading: vocabulary.reading,
      partOfSpeech: vocabulary.part_of_speech,
      jlptLevel: vocabulary.jlpt_level,
      learningStatus: userVocabulary.learning_status,
      meanings: vocabulary.meanings.map((m) => m.meaning),
      examples: vocabulary.examples,
      relatedExpressions: vocabulary.relatedExpressions.map((related): RelatedExpressionRecord => ({
        id: related.id,
        relationType: related.relation_type,
        expression: related.expression,
        meaning: related.meaning,
      })),
      bookIds: vocabulary.bookItems.map((item) => item.vocabulary_book_id),
      isFavorite: userVocabulary.is_favorite,
      tags: vocabulary.tags.map((t) => t.tag),
      createdAt: formatKstISOString(vocabulary.created_at),
      lastReviewedAt: userVocabulary.last_reviewed_at
        ? formatKstISOString(userVocabulary.last_reviewed_at)
        : null,
      nextReviewAt: userVocabulary.next_review_at
        ? formatKstISOString(userVocabulary.next_review_at)
        : null,
    };
  },
);

export const PATCH = withApiHandler(
  async (
    req: NextRequest,
    ctx: RouteContext<"/api/vocabularies/[id]">,
  ): Promise<VocabularyDetail> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    const userVocabulary = await requireOwnedVocabulary(id, session.user.id);

    const body = await req.json();
    const {
      word,
      reading,
      partOfSpeech,
      jlptLevel,
      meanings,
      examples,
      relatedExpressions,
      vocabularyBookIds,
    } = vocabularySchema.parse(body);

    const ownedBookCount = await db.vocabularyBook.count({
      where: { id: { in: vocabularyBookIds }, user_id: session.user.id },
    });
    if (ownedBookCount !== vocabularyBookIds.length) {
      throw new ApiError("VALIDATION_ERROR", "선택한 단어장 중 접근할 수 없는 항목이 있습니다.");
    }

    const vocabulary = await db.$transaction(async (tx) => {
      await tx.vocabularyMeaning.deleteMany({ where: { vocabulary_id: id } });
      await tx.exampleSentence.deleteMany({ where: { vocabulary_id: id } });
      await tx.vocabularyRelatedExpression.deleteMany({ where: { vocabulary_id: id } });
      await tx.vocabularyBookItem.deleteMany({ where: { vocabulary_id: id } });
      await syncVocabularyKanji(tx, id, word);

      return tx.vocabulary.update({
        where: { id },
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
          relatedExpressions: {
            create: relatedExpressions.map((related, index) => ({
              relation_type: related.relationType,
              expression: related.expression,
              meaning: related.meaning,
              order: index,
            })),
          },
          bookItems: {
            create: vocabularyBookIds.map((bookId) => ({ vocabulary_book_id: bookId })),
          },
        },
        include: {
          tags: { select: { tag: { select: { id: true, name: true } } } },
          relatedExpressions: {
            orderBy: { order: "asc" },
            select: { id: true, relation_type: true, expression: true, meaning: true },
          },
        },
      });
    });

    return {
      id: vocabulary.id,
      word: vocabulary.word,
      reading: vocabulary.reading,
      partOfSpeech: vocabulary.part_of_speech,
      jlptLevel: vocabulary.jlpt_level,
      learningStatus: userVocabulary.learning_status,
      meanings,
      examples,
      relatedExpressions: vocabulary.relatedExpressions.map((related): RelatedExpressionRecord => ({
        id: related.id,
        relationType: related.relation_type,
        expression: related.expression,
        meaning: related.meaning,
      })),
      bookIds: vocabularyBookIds,
      isFavorite: userVocabulary.is_favorite,
      tags: vocabulary.tags.map((t) => t.tag),
      createdAt: formatKstISOString(vocabulary.created_at),
      lastReviewedAt: userVocabulary.last_reviewed_at
        ? formatKstISOString(userVocabulary.last_reviewed_at)
        : null,
      nextReviewAt: userVocabulary.next_review_at
        ? formatKstISOString(userVocabulary.next_review_at)
        : null,
    };
  },
);

export const DELETE = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/vocabularies/[id]">,
  ): Promise<{ id: string }> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    await requireOwnedVocabulary(id, session.user.id);

    // Cascades to VocabularyMeaning/ExampleSentence/Image/VocabularyBookItem/UserVocabulary —
    // safe because, until word reuse/sharing ships, only the registering user ever links to this row.
    await db.vocabulary.delete({ where: { id } });

    return { id };
  },
);

import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { vocabularySchema } from "@/lib/validations/vocabulary";
import { syncVocabularyKanji } from "@/lib/vocabulary-kanji";
import { requireOwnedVocabulary } from "@/lib/vocabulary-ownership";
import { planVocabularyEdit } from "@/lib/vocabulary-sharing/plan";
import {
  deleteCallerBookItems,
  forkVocabularyForUser,
  isVocabularyShared,
  removeVocabulariesForUser,
} from "@/lib/vocabulary-sharing/service";
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
        // 공유 단어일 수 있으므로 다른 사용자의 단어장/태그는 응답에 섞이지 않게 호출자 것만 담는다.
        bookItems: {
          where: { book: { user_id: session.user.id } },
          select: { vocabulary_book_id: true },
        },
        tags: {
          where: { tag: { user_id: session.user.id } },
          select: { tag: { select: { id: true, name: true } } },
        },
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
      // 공유 중인 단어(다른 사용자도 연결됨)는 공용 행을 고치면 모두에게 번지므로, 호출자 전용
      // 사본을 만들어 거기에 반영한다(copy-on-write). 응답의 id가 새 id가 될 수 있다.
      const mode = planVocabularyEdit(await isVocabularyShared(tx, id, session.user.id));
      const targetId = mode === "copy-on-write" ? await forkVocabularyForUser(tx, id, session.user.id) : id;

      await tx.vocabularyMeaning.deleteMany({ where: { vocabulary_id: targetId } });
      await tx.exampleSentence.deleteMany({ where: { vocabulary_id: targetId } });
      await tx.vocabularyRelatedExpression.deleteMany({ where: { vocabulary_id: targetId } });
      // 단어장 연결은 호출자 단어장 것만 다시 만든다(다른 사용자의 단어장 항목은 그대로 둔다).
      await deleteCallerBookItems(tx, targetId, session.user.id);
      await syncVocabularyKanji(tx, targetId, word);

      return tx.vocabulary.update({
        where: { id: targetId },
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
          tags: {
            where: { tag: { user_id: session.user.id } },
            select: { tag: { select: { id: true, name: true } } },
          },
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
    const userId = session.user.id;
    await requireOwnedVocabulary(id, userId);

    // 다른 사용자도 이 단어를 쓰고 있으면(커뮤니티 단어장 가져오기는 행을 공유한다) 호출자의
    // 연결만 끊고 행은 남긴다. 아무도 안 쓸 때만 행을 지운다(DB cascade로 뜻/예문/학습 기록 포함).
    await db.$transaction((tx) => removeVocabulariesForUser(tx, [id], userId));

    return { id };
  },
);

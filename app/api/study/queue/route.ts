import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseTodayTargetOverrides } from "@/lib/study/plan-overrides";
import { getTodayQueueBuckets } from "@/lib/study/queries";
import { REVIEW_CATEGORY_KEYS } from "@/lib/study/today-summary";
import type { StudyQueueItem, StudyQueueResponse } from "@/types/study";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(async (req: NextRequest): Promise<StudyQueueResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const userId = session.user.id;
  const now = new Date();
  const { newWordTarget } = parseTodayTargetOverrides(req.nextUrl.searchParams);
  const { newWordIds, reviewIdsByCategory, weakIds } = await getTodayQueueBuckets(
    userId,
    now,
    db,
    newWordTarget,
  );

  // 계획서 3.1 "기본 일일 학습 루틴" 순서: 새 단어 → 어제 복습 → 3/7/14일 복습 → 오답 재시험.
  // 각 버킷은 learning_status로 서로 배타적이라 같은 vocabulary_id가 두 번 나올 수 없다.
  const orderedIds: { id: string; category: StudyQueueItem["category"] }[] = [
    ...newWordIds.map((id) => ({ id, category: "newWords" as const })),
    ...REVIEW_CATEGORY_KEYS.flatMap((key) =>
      reviewIdsByCategory[key].map((id) => ({ id, category: key })),
    ),
    ...weakIds.map((id) => ({ id, category: "weak" as const })),
  ];

  const vocabularies = await db.vocabulary.findMany({
    where: { id: { in: orderedIds.map((item) => item.id) } },
    include: {
      meanings: { select: { meaning: true } },
      examples: { select: { japanese: true, korean: true } },
    },
  });
  const vocabularyById = new Map(vocabularies.map((vocabulary) => [vocabulary.id, vocabulary]));

  const items: StudyQueueItem[] = orderedIds.flatMap(({ id, category }) => {
    const vocabulary = vocabularyById.get(id);
    if (!vocabulary) return [];
    return [
      {
        vocabularyId: vocabulary.id,
        word: vocabulary.word,
        reading: vocabulary.reading,
        meanings: vocabulary.meanings.map((meaning) => meaning.meaning),
        examples: vocabulary.examples.map((example) => ({
          japanese: example.japanese,
          korean: example.korean,
        })),
        category,
      },
    ];
  });

  return { items };
});

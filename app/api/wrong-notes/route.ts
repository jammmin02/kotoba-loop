import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { getWrongNoteStats } from "@/lib/study/wrong-notes";
import { wrongNotesQuerySchema } from "@/lib/validations/wrong-notes";
import type { WrongNoteItem, WrongNotesResponse } from "@/types/wrong-note";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(async (req: NextRequest): Promise<WrongNotesResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { period } = wrongNotesQuerySchema.parse({
    period: req.nextUrl.searchParams.get("period") ?? undefined,
  });

  const userId = session.user.id;
  const stats = await getWrongNoteStats(userId, period, new Date());
  if (stats.length === 0) {
    return { period, items: [] };
  }

  const vocabularies = await db.vocabulary.findMany({
    where: { id: { in: stats.map((stat) => stat.vocabularyId) } },
    include: {
      meanings: { select: { meaning: true } },
      userVocabularies: { where: { user_id: userId }, select: { learning_status: true } },
    },
  });
  const vocabularyById = new Map(vocabularies.map((vocabulary) => [vocabulary.id, vocabulary]));

  // ReviewHistory는 Vocabulary와 FK 관계가 없어, 그 사이 단어가 삭제됐거나 이 사용자
  // 소유가 아니게 된 target_id는 lib/quiz/queries.ts와 동일한 방침으로 조용히 제외한다.
  const items: WrongNoteItem[] = stats.flatMap((stat) => {
    const vocabulary = vocabularyById.get(stat.vocabularyId);
    if (!vocabulary || vocabulary.userVocabularies.length === 0) return [];
    return [
      {
        vocabularyId: vocabulary.id,
        word: vocabulary.word,
        reading: vocabulary.reading,
        meanings: vocabulary.meanings.map((meaning) => meaning.meaning),
        learningStatus: vocabulary.userVocabularies[0].learning_status,
        totalCount: stat.totalCount,
        correctCount: stat.correctCount,
        wrongCount: stat.wrongCount,
        accuracyRate: stat.accuracyRate,
        lastWrongAt: formatKstISOString(stat.lastWrongAt),
      },
    ];
  });

  return { period, items };
});

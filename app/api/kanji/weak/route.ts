import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeakKanjiStats } from "@/lib/study/weak-kanji";
import type { WeakKanjiItem, WeakKanjiRecommendation, WeakKanjiResponse } from "@/types/kanji";

/** 취약 한자 하나당 추천할 단어 수 상한 — 계획서 37장 예시(逃 → 4개)와 비슷한 수준으로 둔다. */
const MAX_RECOMMENDATIONS_PER_KANJI = 6;

export const GET = withApiHandler(async (): Promise<WeakKanjiResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const userId = session.user.id;
  const stats = await getWeakKanjiStats(userId);
  if (stats.length === 0) {
    return { items: [] };
  }

  const kanjiIds = stats.map((stat) => stat.kanjiId);
  const [kanjiRows, recommendationRows] = await Promise.all([
    db.kanji.findMany({ where: { id: { in: kanjiIds } } }),
    // 추천 단어는 그 한자를 포함하되 사용자가 아직 자신의 단어장에 등록하지 않은 단어로 한정한다
    // — 이미 등록한 단어는 /kanji/[character] 상세 페이지("이 한자가 포함된 단어")에서 이미
    // 보여주므로, 여기서는 "더 공부해볼 만한 새 단어"만 추천한다.
    db.vocabulary.findMany({
      where: {
        kanji: { some: { kanji_id: { in: kanjiIds } } },
        userVocabularies: { none: { user_id: userId } },
      },
      include: {
        meanings: { select: { meaning: true } },
        kanji: { where: { kanji_id: { in: kanjiIds } }, select: { kanji_id: true } },
      },
    }),
  ]);

  const kanjiById = new Map(kanjiRows.map((kanji) => [kanji.id, kanji]));
  const recommendationsByKanjiId = new Map<string, WeakKanjiRecommendation[]>();
  for (const vocabulary of recommendationRows) {
    const recommendation: WeakKanjiRecommendation = {
      vocabularyId: vocabulary.id,
      word: vocabulary.word,
      reading: vocabulary.reading,
      meanings: vocabulary.meanings.map((meaning) => meaning.meaning),
    };
    for (const { kanji_id } of vocabulary.kanji) {
      const existing = recommendationsByKanjiId.get(kanji_id) ?? [];
      if (existing.length < MAX_RECOMMENDATIONS_PER_KANJI) {
        existing.push(recommendation);
      }
      recommendationsByKanjiId.set(kanji_id, existing);
    }
  }

  // 취약 한자로 집계됐어도 그 사이 한자 데이터가 지워졌을 가능성은 사실상 없지만(PROMPT
  // 33 시딩 이후 고정), 오답노트(app/api/wrong-notes/route.ts)와 같은 방어적 원칙으로 조용히
  // 제외한다.
  const items: WeakKanjiItem[] = stats.flatMap((stat) => {
    const kanji = kanjiById.get(stat.kanjiId);
    if (!kanji) return [];
    return [
      {
        kanjiId: kanji.id,
        character: kanji.character,
        koreanReading: kanji.korean_reading,
        meaning: kanji.meaning,
        recentCount: stat.recentCount,
        recentWrongCount: stat.recentWrongCount,
        wrongRate: stat.wrongRate,
        recommendations: recommendationsByKanjiId.get(kanji.id) ?? [],
      },
    ];
  });

  return { items };
});

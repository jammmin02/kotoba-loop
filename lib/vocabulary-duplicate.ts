import { db } from "@/lib/db";
import type { JlptLevel, Prisma } from "@/lib/generated/prisma/client";

export interface DuplicateVocabularyCandidate {
  id: string;
  word: string;
  reading: string;
  partOfSpeech: string;
  jlptLevel: JlptLevel | null;
  meanings: string[];
  bookIds: string[];
}

/** `word`+`reading` 정확 일치 기준 중복 판정 키(계획서 27장 — 유사도 매칭은 범위 밖). */
export function duplicateKey(word: string, reading: string): string {
  return word + "::" + reading;
}

/**
 * 사용자가 이미 보유한 단어(`UserVocabulary` 기준 — 단어장 단위가 아니라 사용자 전체 단어)
 * 중 주어진 `{word, reading}` 목록과 정확히 일치하는 것을 찾는다. `Vocabulary`는 user_id가
 * 없고 word/reading에 유니크 제약도 없어 동일 텍스트로 여러 행이 존재할 수 있으므로, 일치하는
 * 행이 여럿이면 가장 먼저 등록된(created_at 오름차순) 행 하나만 대표로 반환한다.
 */
export async function findExistingVocabularies(
  items: { word: string; reading: string }[],
  userId: string,
  client: typeof db | Prisma.TransactionClient = db,
): Promise<Map<string, DuplicateVocabularyCandidate>> {
  const uniqueItems = Array.from(
    new Map(items.map((item) => [duplicateKey(item.word, item.reading), item])).values(),
  );
  if (uniqueItems.length === 0) return new Map();

  const rows = await client.userVocabulary.findMany({
    where: {
      user_id: userId,
      vocabulary: { OR: uniqueItems.map(({ word, reading }) => ({ word, reading })) },
    },
    include: {
      vocabulary: {
        include: {
          meanings: { select: { meaning: true } },
          bookItems: { select: { vocabulary_book_id: true } },
        },
      },
    },
    orderBy: { vocabulary: { created_at: "asc" } },
  });

  const result = new Map<string, DuplicateVocabularyCandidate>();
  for (const row of rows) {
    const key = duplicateKey(row.vocabulary.word, row.vocabulary.reading);
    if (result.has(key)) continue;
    result.set(key, {
      id: row.vocabulary.id,
      word: row.vocabulary.word,
      reading: row.vocabulary.reading,
      partOfSpeech: row.vocabulary.part_of_speech,
      jlptLevel: row.vocabulary.jlpt_level,
      meanings: row.vocabulary.meanings.map((m) => m.meaning),
      bookIds: row.vocabulary.bookItems.map((item) => item.vocabulary_book_id),
    });
  }
  return result;
}

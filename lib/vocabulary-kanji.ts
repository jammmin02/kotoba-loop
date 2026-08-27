import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * 단어 등록/수정 시점에 `word` 원문을 한 글자씩 스캔해 常用漢字와 일치하는 문자만
 * `VocabularyKanji`로 연결한다(PROMPT 34) — `prisma/backfill-vocabulary-kanji.ts`가 PROMPT 33
 * 시점의 기존 단어를 한 번에 소급 연결한 것과 같은 규칙을, 그 이후 새로 생기거나 수정되는
 * 모든 단어에도 실시간으로 적용해 단어→한자 연결이 계속 정확하도록 유지한다.
 * 항상 기존 연결을 지우고 다시 만들어(update 시 word가 바뀌어도 안전) idempotent하게 동작한다.
 */
export async function syncVocabularyKanji(
  tx: Prisma.TransactionClient,
  vocabularyId: string,
  word: string,
) {
  const characters = Array.from(new Set(Array.from(word)));
  const kanjiRows = await tx.kanji.findMany({
    where: { character: { in: characters } },
    select: { id: true },
  });

  await tx.vocabularyKanji.deleteMany({ where: { vocabulary_id: vocabularyId } });
  if (kanjiRows.length > 0) {
    await tx.vocabularyKanji.createMany({
      data: kanjiRows.map((kanji) => ({ vocabulary_id: vocabularyId, kanji_id: kanji.id })),
    });
  }
}

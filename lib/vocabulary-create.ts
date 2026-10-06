import { WORD_ANALYSIS_TYPE } from "@/lib/ai/word-analysis";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { VocabularyCreateInput } from "@/lib/validations/vocabulary";
import { syncVocabularyKanji } from "@/lib/vocabulary-kanji";

/**
 * 단어 하나를 만들어 사용자 소유(`UserVocabulary`)로 연결하고, 한자 연결과 AI 분석 상태
 * (confirmed/edited)까지 반영한다. 업적 판정은 호출부 몫이다 — 한 요청에서 여러 단어를
 * 만드는 호출(`/api/vocabularies/batch`)이 마지막에 한 번만 판정할 수 있게 하려는 것이다.
 * 호출부가 넘긴 트랜잭션 안에서 실행된다.
 */
export async function createVocabularyRecord(
  tx: Prisma.TransactionClient,
  userId: string,
  input: VocabularyCreateInput,
) {
  const {
    word,
    reading,
    partOfSpeech,
    jlptLevel,
    meanings,
    examples,
    relatedExpressions,
    vocabularyBookIds,
    aiAnalysisId,
    aiFieldsEdited,
  } = input;

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
      relatedExpressions: {
        create: relatedExpressions.map((related, index) => ({
          relation_type: related.relationType,
          expression: related.expression,
          meaning: related.meaning,
          order: index,
        })),
      },
      bookItems: { create: vocabularyBookIds.map((bookId) => ({ vocabulary_book_id: bookId })) },
    },
  });
  await tx.userVocabulary.create({
    data: { user_id: userId, vocabulary_id: created.id, learning_status: "NEW" },
  });
  await syncVocabularyKanji(tx, created.id, word);
  if (aiAnalysisId) {
    // Best-effort: an unknown/foreign id just updates 0 rows, never fails the save.
    await tx.aIAnalysis.updateMany({
      where: { id: aiAnalysisId, user_id: userId, analysis_type: WORD_ANALYSIS_TYPE },
      data: { status: aiFieldsEdited ? "edited" : "confirmed" },
    });
  }
  return created;
}

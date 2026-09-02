import "server-only";

import { db } from "@/lib/db";
import type {
  QuizKanji,
  QuizKanjiPoolEntry,
  QuizPoolEntry,
  QuizVocabulary,
} from "@/lib/quiz/types";

/**
 * 퀴즈 대상 단어를 뜻/예문과 함께 조회한다. 존재하지 않는 id는 결과에서 조용히 빠진다 —
 * 호출자(`POST /api/quiz/session`)가 이미 `requireOwnedVocabularies`로 소유권을
 * 검증했다는 전제이므로, 여기서는 다시 에러를 던지지 않는다. 입력 순서를 그대로 보존한다.
 */
export async function fetchQuizVocabularies(ids: string[]): Promise<QuizVocabulary[]> {
  const rows = await db.vocabulary.findMany({
    where: { id: { in: ids } },
    include: {
      meanings: { select: { meaning: true } },
      examples: { select: { japanese: true, korean: true } },
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  return ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    return [
      {
        id: row.id,
        word: row.word,
        reading: row.reading,
        partOfSpeech: row.part_of_speech,
        jlptLevel: row.jlpt_level,
        meanings: row.meanings.map((meaning) => meaning.meaning),
        examples: row.examples.map((example) => ({
          japanese: example.japanese,
          korean: example.korean,
        })),
      },
    ];
  });
}

function uniquePartOfSpeechLevelPairs(targets: QuizVocabulary[]) {
  const seen = new Map<string, { partOfSpeech: string; jlptLevel: QuizVocabulary["jlptLevel"] }>();
  for (const target of targets) {
    const key = `${target.partOfSpeech}::${target.jlptLevel ?? ""}`;
    if (!seen.has(key)) {
      seen.set(key, { partOfSpeech: target.partOfSpeech, jlptLevel: target.jlptLevel });
    }
  }
  return [...seen.values()];
}

/**
 * 객관식 오답 보기 후보 풀(PROMPT 19 `generateQuestion`의 MULTIPLE_CHOICE 입력)을 조회한다.
 * 전체 단어를 다 훑지 않도록, 대상 단어들이 실제로 가진 (품사, JLPT 레벨) 조합에 해당하는
 * 단어만 좁혀서 가져온다.
 *
 * 대상 단어 자신도 일부러 걸러내지 않는다 — 배치 안의 다른 대상 단어도 서로에게 훌륭한
 * 오답 후보이기 때문이다(예: 커스텀 학습에서 품사 하나로만 이루어진 단어장을 통째로 고르면,
 * 그 품사/레벨 조합의 유일한 단어들이 바로 이 배치 자신일 수 있다). 실제 자기 자신 제외는
 * `collectWrongMeanings`(lib/quiz/generator.ts)가 문제별로 `entry.id === target.id`로 처리한다.
 */
export async function fetchQuizPool(targets: QuizVocabulary[]): Promise<QuizPoolEntry[]> {
  const pairs = uniquePartOfSpeechLevelPairs(targets);
  if (pairs.length === 0) return [];

  const rows = await db.vocabulary.findMany({
    where: {
      OR: pairs.map((pair) => ({ part_of_speech: pair.partOfSpeech, jlpt_level: pair.jlptLevel })),
    },
    select: {
      id: true,
      part_of_speech: true,
      jlpt_level: true,
      meanings: { select: { meaning: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    partOfSpeech: row.part_of_speech,
    jlptLevel: row.jlpt_level,
    meanings: row.meanings.map((meaning) => meaning.meaning),
  }));
}

/**
 * 퀴즈 대상 한자를 조회한다(PROMPT 36). 한자는 `Vocabulary`와 달리 소유권 개념이 없는 공용
 * 데이터(常用漢字 2,136자 전원 공통, PROMPT 33)라 `fetchQuizVocabularies`와 달리 소유권 검증을
 * 전제하지 않는다. 존재하지 않는 id는 결과에서 조용히 빠지고, 입력 순서를 그대로 보존한다.
 */
export async function fetchQuizKanji(ids: string[]): Promise<QuizKanji[]> {
  const rows = await db.kanji.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((row) => [row.id, row]));

  return ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    return [
      {
        id: row.id,
        character: row.character,
        onyomi: row.onyomi,
        kunyomi: row.kunyomi,
        schoolGrade: row.school_grade,
        meaning: row.meaning,
      },
    ];
  });
}

/**
 * 한자 객관식 오답 보기 후보 풀(PROMPT 36 `generateKanjiQuestion`의 입력)을 조회한다. 常用漢字는
 * 전체가 2,136자로 고정돼 있어(PROMPT 33), `GET /api/kanji`가 이미 확정한 전례대로 조건 없이
 * 전량을 가져와도 이 데이터 규모에서는 부담이 없다 — 단어 풀처럼 대상별 (품사, JLPT 레벨) 조합으로
 * 좁힐 필요가 없다.
 */
export async function fetchKanjiPool(): Promise<QuizKanjiPoolEntry[]> {
  const rows = await db.kanji.findMany({
    select: { id: true, character: true, school_grade: true, meaning: true },
  });

  return rows.map((row) => ({
    id: row.id,
    character: row.character,
    schoolGrade: row.school_grade,
    meaning: row.meaning,
  }));
}

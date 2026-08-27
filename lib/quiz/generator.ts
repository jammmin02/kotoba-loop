import { MULTIPLE_CHOICE_WRONG_COUNT } from "@/lib/quiz/constants";
import { normalizeAnswer } from "@/lib/quiz/normalize";
import { pickRandom, shuffle } from "@/lib/quiz/random";
import type {
  QuizKanji,
  QuizKanjiPoolEntry,
  QuizPoolEntry,
  QuizQuestion,
  QuizType,
  QuizVocabulary,
} from "@/lib/quiz/types";

function generateJaToKo(target: QuizVocabulary): QuizQuestion | null {
  if (target.meanings.length === 0) return null;
  return {
    quizType: "JA_TO_KO",
    targetType: "vocab",
    targetId: target.id,
    prompt: target.word,
    correctAnswer: target.meanings[0],
    acceptableAnswers: target.meanings,
  };
}

function generateKoToJa(target: QuizVocabulary, random: () => number): QuizQuestion | null {
  if (target.meanings.length === 0) return null;
  return {
    quizType: "KO_TO_JA",
    targetType: "vocab",
    targetId: target.id,
    prompt: pickRandom(target.meanings, random),
    correctAnswer: target.word,
    // 한자 입력을 강제하지 않고 읽기(카나)로도 정답 처리한다(추가 결정 필요 항목의 기본값).
    acceptableAnswers: [target.reading],
  };
}

function generateFurigana(target: QuizVocabulary): QuizQuestion | null {
  if (!target.reading) return null;
  return {
    quizType: "FURIGANA",
    targetType: "vocab",
    targetId: target.id,
    prompt: target.word,
    correctAnswer: target.reading,
  };
}

/**
 * 오답 보기는 같은 JLPT 레벨/품사를 가진 다른 단어의 뜻에서 하나씩만 뽑는다(단어당 1개 —
 * 한 단어의 여러 뜻을 복수 오답으로 쓰지 않는다). 정답 뜻과 겹치는 후보는 제외한다.
 */
function collectWrongMeanings(target: QuizVocabulary, pool: QuizPoolEntry[]): string[] {
  const seen = new Set(target.meanings.map(normalizeAnswer));
  const wrongMeanings: string[] = [];

  for (const entry of pool) {
    if (entry.id === target.id) continue;
    if (entry.jlptLevel !== target.jlptLevel || entry.partOfSpeech !== target.partOfSpeech)
      continue;

    const meaning = entry.meanings.find((m) => !seen.has(normalizeAnswer(m)));
    if (!meaning) continue;

    seen.add(normalizeAnswer(meaning));
    wrongMeanings.push(meaning);
  }

  return wrongMeanings;
}

function generateMultipleChoice(
  target: QuizVocabulary,
  pool: QuizPoolEntry[],
  random: () => number,
): QuizQuestion | null {
  if (target.meanings.length === 0) return null;

  const wrongCandidates = collectWrongMeanings(target, pool);
  if (wrongCandidates.length < MULTIPLE_CHOICE_WRONG_COUNT) return null;

  const wrongMeanings = shuffle(wrongCandidates, random).slice(0, MULTIPLE_CHOICE_WRONG_COUNT);
  const correctMeaning = pickRandom(target.meanings, random);

  const choices = shuffle(
    [
      { id: "correct", text: correctMeaning },
      ...wrongMeanings.map((text, index) => ({ id: `wrong-${index}`, text })),
    ],
    random,
  );

  return {
    quizType: "MULTIPLE_CHOICE",
    targetType: "vocab",
    targetId: target.id,
    prompt: target.word,
    choices,
    correctAnswer: "correct",
  };
}

function generateFillInBlank(target: QuizVocabulary): QuizQuestion | null {
  const example = target.examples.find((ex) => ex.japanese.includes(target.word));
  if (!example) return null;

  return {
    quizType: "FILL_IN_BLANK",
    targetType: "vocab",
    targetId: target.id,
    prompt: example.japanese.replace(target.word, "___"),
    correctAnswer: target.word,
    acceptableAnswers: [target.reading],
  };
}

function generateSentenceTranslation(target: QuizVocabulary): QuizQuestion | null {
  if (target.meanings.length === 0) return null;
  const example = target.examples.find((ex) => ex.korean.trim().length > 0);
  if (!example) return null;

  return {
    quizType: "SENTENCE_TRANSLATION",
    targetType: "vocab",
    targetId: target.id,
    prompt: example.japanese,
    correctAnswer: example.korean,
    acceptableAnswers: target.meanings,
  };
}

/**
 * 대상 단어와 문제 유형을 받아 문제 데이터를 만든다. 필요한 데이터(뜻/읽기/예문/오답 풀)가
 * 부족하면 예외 없이 `null`을 반환한다 — 호출자(`generateQuizSession`)가 다른 유형으로 대체한다.
 */
export function generateQuestion(
  target: QuizVocabulary,
  quizType: QuizType,
  pool: QuizPoolEntry[],
  random: () => number = Math.random,
): QuizQuestion | null {
  switch (quizType) {
    case "JA_TO_KO":
      return generateJaToKo(target);
    case "KO_TO_JA":
      return generateKoToJa(target, random);
    case "FURIGANA":
      return generateFurigana(target);
    case "MULTIPLE_CHOICE":
      return generateMultipleChoice(target, pool, random);
    case "FILL_IN_BLANK":
      return generateFillInBlank(target);
    case "SENTENCE_TRANSLATION":
      return generateSentenceTranslation(target);
    default:
      // 한자 전용 유형이 단어 대상에 배정될 일은 없다(session.ts가 대상별로 허용 유형을 분리).
      return null;
  }
}

/**
 * 훈독/음독 문자열에서 채점·표시에 쓸 순수 가나만 남긴다: okurigana 구분점(".")과 접두/접미
 * 표시("-", 예: 시드 데이터의 "とこ-"/"-あて" — 이 훈독이 단독으로 쓰이지 않고 다른 말 앞/뒤에
 * 붙을 때만 쓰인다는 사전 표기, PROMPT 33 시드가 KANJIDIC 표기를 그대로 가져왔다) 둘 다 제거한다.
 */
function cleanReading(reading: string): string {
  return reading.replace(/[-.]/g, "");
}

/** okurigana 구분점(예: "す.ごす")을 "stem"(한자로 읽는 부분)과 "okurigana"(뒤에 붙는 가나)로
 * 쪼갠다. 분리 전에 접두/접미 표시("-")부터 제거한다("-ちが.える" → "ちが.える"). */
function splitOkurigana(reading: string): { stem: string; okurigana: string } | null {
  const withoutAffixMark = reading.replace(/-/g, "");
  const dotIndex = withoutAffixMark.indexOf(".");
  if (dotIndex === -1) return null;
  return {
    stem: withoutAffixMark.slice(0, dotIndex),
    okurigana: withoutAffixMark.slice(dotIndex + 1),
  };
}

/**
 * 뜻 맞히기(KANJI_MEANING) 객관식 오답: 같은 상용한자 학년(school_grade) 버킷에서 서로 다른
 * `meaning` 문자열을 가진 한자를 뽑는다. `Kanji.meaning`은 영문 콤마열이지만, 한자 상세
 * 페이지(PROMPT 34)가 이미 이 필드를 그대로 노출하고 있어 퀴즈에서도 동일하게 사용한다.
 */
function collectWrongKanjiMeanings(
  target: QuizKanji,
  pool: QuizKanjiPoolEntry[],
  random: () => number,
): string[] {
  const bucket = pool.filter((entry) => entry.id !== target.id && entry.schoolGrade === target.schoolGrade);
  const candidates = bucket.length >= MULTIPLE_CHOICE_WRONG_COUNT
    ? bucket
    : pool.filter((entry) => entry.id !== target.id);

  const seen = new Set([normalizeAnswer(target.meaning)]);
  const wrongMeanings: string[] = [];
  for (const entry of shuffle(candidates, random)) {
    const normalized = normalizeAnswer(entry.meaning);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    wrongMeanings.push(entry.meaning);
    if (wrongMeanings.length === MULTIPLE_CHOICE_WRONG_COUNT) break;
  }
  return wrongMeanings;
}

function generateKanjiMeaning(
  target: QuizKanji,
  pool: QuizKanjiPoolEntry[],
  random: () => number,
): QuizQuestion | null {
  const wrongMeanings = collectWrongKanjiMeanings(target, pool, random);
  if (wrongMeanings.length < MULTIPLE_CHOICE_WRONG_COUNT) return null;

  const choices = shuffle(
    [
      { id: "correct", text: target.meaning },
      ...wrongMeanings.map((text, index) => ({ id: `wrong-${index}`, text })),
    ],
    random,
  );

  return {
    quizType: "KANJI_MEANING",
    targetType: "kanji",
    targetId: target.id,
    prompt: target.character,
    choices,
    correctAnswer: "correct",
  };
}

/**
 * 읽기(KANJI_READING) 주관식: 음독(가타카나)/훈독(히라가나, `cleanReading`으로 표기 기호 제거)
 * 전체를 정답으로 인정한다. 대표 정답(`correctAnswer`, 오답 시 화면에 보여줄 값)은 그중 하나를
 * 무작위로 고른다 — 단어 퀴즈의 KO_TO_JA가 여러 뜻 중 하나를 프롬프트로 고르는 것과 같은 이유.
 */
function generateKanjiReading(target: QuizKanji, random: () => number): QuizQuestion | null {
  const readings = [
    ...new Set([...target.onyomi, ...target.kunyomi].map(cleanReading).filter((r) => r.length > 0)),
  ];
  if (readings.length === 0) return null;

  return {
    quizType: "KANJI_READING",
    targetType: "kanji",
    targetId: target.id,
    prompt: target.character,
    correctAnswer: pickRandom(readings, random),
    acceptableAnswers: readings,
  };
}

/**
 * 한자 선택(KANJI_SELECT) 객관식 — 계획서 33장 예시(すごす → 過ごす/通ごす/超ごす) 재현.
 * okurigana가 있는 훈독을 우선 사용해 "읽기(가나) → 한자+오쿠리가나 표기" 형태로 묻고, 오답은
 * 같은 학년 버킷의 다른 한자에 동일 오쿠리가나를 붙여 만든다(실재하는 단어가 아니어도 됨 —
 * 계획서 예시의 "通ごす/超ごす"도 실제 단어가 아니라 시각적으로 헷갈리는 오답이다).
 * okurigana가 있는 훈독이 없으면 오쿠리가나 없는 훈독/음독으로 대체하고, 그마저 없으면 `null`.
 */
function generateKanjiSelect(
  target: QuizKanji,
  pool: QuizKanjiPoolEntry[],
  random: () => number,
): QuizQuestion | null {
  const withOkurigana = target.kunyomi
    .map(splitOkurigana)
    .filter((v): v is { stem: string; okurigana: string } => v !== null);
  const plainReadings = [...target.kunyomi.filter((k) => !k.includes(".")), ...target.onyomi]
    .map(cleanReading)
    .filter((r) => r.length > 0);

  let reading: string;
  let displayForm: string;
  if (withOkurigana.length > 0) {
    const picked = pickRandom(withOkurigana, random);
    reading = picked.stem + picked.okurigana;
    displayForm = target.character + picked.okurigana;
  } else if (plainReadings.length > 0) {
    reading = pickRandom(plainReadings, random);
    displayForm = target.character;
  } else {
    return null;
  }

  const bucket = pool.filter((entry) => entry.id !== target.id && entry.schoolGrade === target.schoolGrade);
  const candidates = bucket.length >= MULTIPLE_CHOICE_WRONG_COUNT
    ? bucket
    : pool.filter((entry) => entry.id !== target.id);
  const distractors = shuffle(candidates, random).slice(0, MULTIPLE_CHOICE_WRONG_COUNT);
  if (distractors.length < MULTIPLE_CHOICE_WRONG_COUNT) return null;

  const okuriganaSuffix = displayForm.slice(target.character.length);
  const choices = shuffle(
    [
      { id: "correct", text: displayForm },
      ...distractors.map((entry, index) => ({
        id: `wrong-${index}`,
        text: entry.character + okuriganaSuffix,
      })),
    ],
    random,
  );

  return {
    quizType: "KANJI_SELECT",
    targetType: "kanji",
    targetId: target.id,
    prompt: reading,
    choices,
    correctAnswer: "correct",
  };
}

/** 대상 한자와 문제 유형을 받아 문제 데이터를 만든다. `generateQuestion`의 한자 버전 —
 * 데이터가 부족하면 `null`을 반환해 `generateKanjiQuizSession`이 다른 유형으로 대체한다. */
export function generateKanjiQuestion(
  target: QuizKanji,
  quizType: QuizType,
  pool: QuizKanjiPoolEntry[],
  random: () => number = Math.random,
): QuizQuestion | null {
  switch (quizType) {
    case "KANJI_MEANING":
      return generateKanjiMeaning(target, pool, random);
    case "KANJI_READING":
      return generateKanjiReading(target, random);
    case "KANJI_SELECT":
      return generateKanjiSelect(target, pool, random);
    default:
      // 단어 전용 유형이 한자 대상에 배정될 일은 없다(session.ts가 대상별로 허용 유형을 분리).
      return null;
  }
}

import assert from "node:assert/strict";
import { test } from "node:test";

import { generateKanjiQuestion, generateQuestion } from "@/lib/quiz/generator";
import type {
  QuizKanji,
  QuizKanjiPoolEntry,
  QuizPoolEntry,
  QuizVocabulary,
} from "@/lib/quiz/types";

const TARGET: QuizVocabulary = {
  id: "target",
  word: "食べる",
  reading: "たべる",
  partOfSpeech: "동사",
  jlptLevel: "N5",
  meanings: ["먹다"],
  examples: [{ japanese: "パンを食べる。", korean: "빵을 먹는다." }],
};

function poolEntry(id: string, meanings: string[]): QuizPoolEntry {
  return { id, partOfSpeech: "동사", jlptLevel: "N5", meanings };
}

const SUFFICIENT_POOL: QuizPoolEntry[] = [
  poolEntry("p1", ["마시다"]),
  poolEntry("p2", ["자다"]),
  poolEntry("p3", ["걷다"]),
];

test("JA_TO_KO: 단어를 보여주고 뜻을 정답으로 삼는다", () => {
  const question = generateQuestion(TARGET, "JA_TO_KO", []);
  assert.ok(question);
  assert.equal(question.targetType, "vocab");
  assert.equal(question.targetId, "target");
  assert.equal(question.prompt, "食べる");
  assert.equal(question.correctAnswer, "먹다");
  assert.deepEqual(question.acceptableAnswers, ["먹다"]);
});

test("JA_TO_KO: 뜻이 하나도 없으면 null을 반환한다(폴백 대상)", () => {
  const noMeaning: QuizVocabulary = { ...TARGET, meanings: [] };
  assert.equal(generateQuestion(noMeaning, "JA_TO_KO", []), null);
});

test("KO_TO_JA: 뜻을 보여주고 단어(한자)를 정답으로 삼으며 읽기도 인정한다", () => {
  const question = generateQuestion(TARGET, "KO_TO_JA", []);
  assert.ok(question);
  assert.equal(question.prompt, "먹다");
  assert.equal(question.correctAnswer, "食べる");
  assert.deepEqual(question.acceptableAnswers, ["たべる"]);
});

test("FURIGANA: 단어를 보여주고 읽기를 정답으로 삼는다", () => {
  const question = generateQuestion(TARGET, "FURIGANA", []);
  assert.ok(question);
  assert.equal(question.prompt, "食べる");
  assert.equal(question.correctAnswer, "たべる");
});

test("FURIGANA: 읽기가 없으면 null을 반환한다", () => {
  const noReading: QuizVocabulary = { ...TARGET, reading: "" };
  assert.equal(generateQuestion(noReading, "FURIGANA", []), null);
});

test("MULTIPLE_CHOICE: 오답 풀이 충분하면 정답 1개 + 오답 3개로 4지선다를 만든다", () => {
  const question = generateQuestion(TARGET, "MULTIPLE_CHOICE", SUFFICIENT_POOL, () => 0.5);
  assert.ok(question);
  assert.equal(question.choices?.length, 4);
  const correctChoice = question.choices?.find((choice) => choice.id === question.correctAnswer);
  assert.equal(correctChoice?.text, "먹다");
  const wrongTexts = question.choices
    ?.filter((choice) => choice.id !== question.correctAnswer)
    .map((c) => c.text);
  assert.deepEqual(new Set(wrongTexts), new Set(["마시다", "자다", "걷다"]));
});

test("MULTIPLE_CHOICE: 오답 풀이 부족하면(3개 미만) null을 반환한다", () => {
  const smallPool = SUFFICIENT_POOL.slice(0, 2);
  assert.equal(generateQuestion(TARGET, "MULTIPLE_CHOICE", smallPool), null);
});

test("MULTIPLE_CHOICE: 다른 JLPT 레벨/품사의 단어는 오답 풀에서 제외된다", () => {
  const wrongLevelPool = [
    { ...poolEntry("p1", ["마시다"]), jlptLevel: "N4" as const },
    { ...poolEntry("p2", ["자다"]), partOfSpeech: "명사" },
    poolEntry("p3", ["걷다"]),
  ];
  assert.equal(generateQuestion(TARGET, "MULTIPLE_CHOICE", wrongLevelPool), null);
});

test("MULTIPLE_CHOICE: 정답 뜻과 겹치는 후보는 오답으로 쓰지 않는다", () => {
  const overlappingPool = [
    poolEntry("p1", ["먹다"]),
    poolEntry("p2", ["자다"]),
    poolEntry("p3", ["걷다"]),
  ];
  // p1의 유일한 뜻("먹다")이 정답과 겹쳐 제외되므로 오답 후보가 2개뿐 → 폴백 대상
  assert.equal(generateQuestion(TARGET, "MULTIPLE_CHOICE", overlappingPool), null);
});

test("FILL_IN_BLANK: 단어가 등장하는 예문에서 단어를 빈칸으로 치환한다", () => {
  const question = generateQuestion(TARGET, "FILL_IN_BLANK", []);
  assert.ok(question);
  assert.equal(question.prompt, "パンを___。");
  assert.equal(question.correctAnswer, "食べる");
});

test("FILL_IN_BLANK: 단어가 포함된 예문이 없으면 null을 반환한다", () => {
  const noMatch: QuizVocabulary = {
    ...TARGET,
    examples: [{ japanese: "犬が走る。", korean: "개가 달린다." }],
  };
  assert.equal(generateQuestion(noMatch, "FILL_IN_BLANK", []), null);
});

test("SENTENCE_TRANSLATION: 예문과 번역을 그대로 문제/정답으로 쓰고 뜻을 키워드로 넘긴다", () => {
  const question = generateQuestion(TARGET, "SENTENCE_TRANSLATION", []);
  assert.ok(question);
  assert.equal(question.prompt, "パンを食べる。");
  assert.equal(question.correctAnswer, "빵을 먹는다.");
  assert.deepEqual(question.acceptableAnswers, ["먹다"]);
});

test("SENTENCE_TRANSLATION: 한국어 번역이 있는 예문이 없으면 null을 반환한다", () => {
  const noKorean: QuizVocabulary = {
    ...TARGET,
    examples: [{ japanese: "パンを食べる。", korean: "" }],
  };
  assert.equal(generateQuestion(noKorean, "SENTENCE_TRANSLATION", []), null);
});

// --- 한자 퀴즈(PROMPT 36) ---

const KANJI_TARGET: QuizKanji = {
  id: "kanji-target",
  character: "過",
  onyomi: ["カ"],
  kunyomi: ["す.ごす", "す.ぎる"],
  schoolGrade: 8,
  meaning: "exceed, overdo, error, pass time, guilt, sin, indiscretion, transgress",
};

function kanjiPoolEntry(id: string, character: string, meaning: string): QuizKanjiPoolEntry {
  return { id, character, schoolGrade: 8, meaning };
}

const SUFFICIENT_KANJI_POOL: QuizKanjiPoolEntry[] = [
  kanjiPoolEntry("k1", "通", "traffic, pass through, avenue, commute"),
  kanjiPoolEntry("k2", "超", "ultra, super, exceeding"),
  kanjiPoolEntry("k3", "越", "cross over, go beyond"),
];

test("KANJI_MEANING: 뜻 풀이 충분하면 정답 1개 + 오답 3개로 4지선다를 만든다", () => {
  const question = generateKanjiQuestion(
    KANJI_TARGET,
    "KANJI_MEANING",
    SUFFICIENT_KANJI_POOL,
    () => 0.5,
  );
  assert.ok(question);
  assert.equal(question.targetType, "kanji");
  assert.equal(question.targetId, "kanji-target");
  assert.equal(question.prompt, "過");
  assert.equal(question.choices?.length, 4);
  const correctChoice = question.choices?.find((choice) => choice.id === question.correctAnswer);
  assert.equal(correctChoice?.text, KANJI_TARGET.meaning);
});

test("KANJI_MEANING: 같은 학년 버킷에 서로 다른 뜻이 3개 미만이면 null을 반환한다", () => {
  const smallPool = SUFFICIENT_KANJI_POOL.slice(0, 2);
  assert.equal(
    generateKanjiQuestion(KANJI_TARGET, "KANJI_MEANING", smallPool, () => 0.5),
    null,
  );
});

test("KANJI_READING: 음독/훈독 전부를 정답으로 인정하고 okurigana 구분점을 제거한다", () => {
  const question = generateKanjiQuestion(KANJI_TARGET, "KANJI_READING", [], () => 0);
  assert.ok(question);
  assert.equal(question.prompt, "過");
  assert.deepEqual(question.acceptableAnswers, ["カ", "すごす", "すぎる"]);
});

test("KANJI_READING: 음독/훈독이 전혀 없으면 null을 반환한다", () => {
  const noReading: QuizKanji = { ...KANJI_TARGET, onyomi: [], kunyomi: [] };
  assert.equal(
    generateKanjiQuestion(noReading, "KANJI_READING", [], () => 0),
    null,
  );
});

test("KANJI_SELECT: okurigana가 있는 훈독으로 '읽기 → 한자+오쿠리가나' 보기를 만든다(계획서 33장 예시)", () => {
  const question = generateKanjiQuestion(
    KANJI_TARGET,
    "KANJI_SELECT",
    SUFFICIENT_KANJI_POOL,
    () => 0,
  );
  assert.ok(question);
  assert.equal(question.prompt, "すごす");
  assert.equal(question.choices?.length, 4);
  const correctChoice = question.choices?.find((choice) => choice.id === question.correctAnswer);
  assert.equal(correctChoice?.text, "過ごす");
  const wrongTexts = question.choices
    ?.filter((choice) => choice.id !== question.correctAnswer)
    .map((c) => c.text);
  assert.deepEqual(new Set(wrongTexts), new Set(["通ごす", "超ごす", "越ごす"]));
});

test("KANJI_SELECT: 오답 후보가 3개 미만이면 null을 반환한다", () => {
  const smallPool = SUFFICIENT_KANJI_POOL.slice(0, 2);
  assert.equal(
    generateKanjiQuestion(KANJI_TARGET, "KANJI_SELECT", smallPool, () => 0),
    null,
  );
});

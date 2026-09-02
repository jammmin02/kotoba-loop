import assert from "node:assert/strict";
import { test } from "node:test";

import { generateKanjiQuizSession, generateQuizSession } from "@/lib/quiz/session";
import type { QuizKanji, QuizVocabulary } from "@/lib/quiz/types";

test("생성 가능한 유형이 있는 단어는 배정된 유형이 실패해도 다른 유형으로 대체되어 문제가 나온다", () => {
  // 뜻/예문이 없어 JA_TO_KO/KO_TO_JA/객관식/빈칸/예문해석은 모두 실패하고, FURIGANA만 가능하다.
  const readingOnly: QuizVocabulary = {
    id: "v1",
    word: "食べる",
    reading: "たべる",
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: [],
    examples: [],
  };

  const questions = generateQuizSession([readingOnly], [], () => 0.1);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].quizType, "FURIGANA");
});

test("어떤 유형도 생성할 수 없는 단어는 결과에서 제외되고 에러 없이 폴백된다", () => {
  const empty: QuizVocabulary = {
    id: "v1",
    word: "",
    reading: "",
    partOfSpeech: "동사",
    jlptLevel: null,
    meanings: [],
    examples: [],
  };

  assert.doesNotThrow(() => {
    const questions = generateQuizSession([empty], [], () => 0.1);
    assert.equal(questions.length, 0);
  });
});

test("모두 생성 가능한 단어 여러 개를 넘기면 단어 수만큼 문제가 나온다", () => {
  const targets: QuizVocabulary[] = Array.from({ length: 6 }, (_, i) => ({
    id: `v${i}`,
    word: `단어${i}`,
    reading: `よみ${i}`,
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: [`뜻${i}`],
    examples: [{ japanese: `文${i}。`, korean: `문장${i}.` }],
  }));

  const questions = generateQuizSession(targets, [], () => 0.4);
  assert.equal(questions.length, 6);
  assert.deepEqual(questions.map((q) => q.targetId).sort(), targets.map((t) => t.id).sort());
  assert.ok(questions.every((q) => q.targetType === "vocab"));
});

// --- 한자 퀴즈(PROMPT 36) ---

test("한자 세션: 읽기만 가능한 한자는 KANJI_READING으로 대체되어 문제가 나온다", () => {
  // 훈독에 okurigana가 없고 오답 풀도 없어 KANJI_SELECT/KANJI_MEANING은 실패하고 KANJI_READING만 가능하다.
  const readingOnly: QuizKanji = {
    id: "k1",
    character: "亜",
    onyomi: ["ア"],
    kunyomi: [],
    schoolGrade: 8,
    meaning: "Asia",
  };

  const questions = generateKanjiQuizSession([readingOnly], [], () => 0.1);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].quizType, "KANJI_READING");
  assert.equal(questions[0].targetType, "kanji");
});

test("한자 세션: 읽기조차 없는 한자는 결과에서 제외된다", () => {
  const empty: QuizKanji = {
    id: "k1",
    character: "亜",
    onyomi: [],
    kunyomi: [],
    schoolGrade: 8,
    meaning: "Asia",
  };

  const questions = generateKanjiQuizSession([empty], [], () => 0.1);
  assert.equal(questions.length, 0);
});

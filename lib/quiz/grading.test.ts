import assert from "node:assert/strict";
import { test } from "node:test";

import { gradeQuizAnswer } from "@/lib/quiz/grading";
import type { QuizQuestion } from "@/lib/quiz/types";

test("JA_TO_KO: 여러 뜻 중 하나만 맞아도 정답이다", () => {
  const question: QuizQuestion = {
    quizType: "JA_TO_KO",
    targetType: "vocab",
    targetId: "v1",
    prompt: "食べる",
    correctAnswer: "먹다",
    acceptableAnswers: ["먹다", "식사하다"],
  };
  assert.equal(gradeQuizAnswer(question, "식사하다"), true);
  assert.equal(gradeQuizAnswer(question, "마시다"), false);
});

test("JA_TO_KO: 공백/오탈자 수준의 차이는 정답으로 처리한다", () => {
  const question: QuizQuestion = {
    quizType: "JA_TO_KO",
    targetType: "vocab",
    targetId: "v1",
    prompt: "食べる",
    correctAnswer: "먹다",
    acceptableAnswers: ["먹다"],
  };
  assert.equal(gradeQuizAnswer(question, "  먹다  "), true);
});

test("FURIGANA: 카타카나로 입력해도 히라가나 정답과 일치하면 정답이다", () => {
  const question: QuizQuestion = {
    quizType: "FURIGANA",
    targetType: "vocab",
    targetId: "v1",
    prompt: "食べる",
    correctAnswer: "たべる",
  };
  assert.equal(gradeQuizAnswer(question, "タベル"), true);
});

test("KO_TO_JA: 정답 단어(한자) 또는 읽기 중 하나만 맞아도 정답이다", () => {
  const question: QuizQuestion = {
    quizType: "KO_TO_JA",
    targetType: "vocab",
    targetId: "v1",
    prompt: "먹다",
    correctAnswer: "食べる",
    acceptableAnswers: ["たべる"],
  };
  assert.equal(gradeQuizAnswer(question, "食べる"), true);
  assert.equal(gradeQuizAnswer(question, "たべる"), true);
  assert.equal(gradeQuizAnswer(question, "飲む"), false);
});

test("MULTIPLE_CHOICE: 선택한 보기 id가 정답 id와 같을 때만 정답이다", () => {
  const question: QuizQuestion = {
    quizType: "MULTIPLE_CHOICE",
    targetType: "vocab",
    targetId: "v1",
    prompt: "食べる",
    choices: [
      { id: "correct", text: "먹다" },
      { id: "wrong-0", text: "마시다" },
    ],
    correctAnswer: "correct",
  };
  assert.equal(gradeQuizAnswer(question, "correct"), true);
  assert.equal(gradeQuizAnswer(question, "wrong-0"), false);
  // 객관식은 id 비교만 하므로 텍스트를 그대로 보내면 오답 처리된다.
  assert.equal(gradeQuizAnswer(question, "먹다"), false);
});

test("SENTENCE_TRANSLATION: 정답 뜻이 키워드로 포함되어 있으면 정답으로 처리한다", () => {
  const question: QuizQuestion = {
    quizType: "SENTENCE_TRANSLATION",
    targetType: "vocab",
    targetId: "v1",
    prompt: "パンを食べる。",
    correctAnswer: "빵을 먹는다.",
    acceptableAnswers: ["먹다"],
  };
  assert.equal(gradeQuizAnswer(question, "빵을 먹었어요"), true);
  assert.equal(gradeQuizAnswer(question, "빵을 마셨어요"), false);
});

test("빈 답안은 어떤 유형에서도 정답으로 처리되지 않는다", () => {
  const question: QuizQuestion = {
    quizType: "FURIGANA",
    targetType: "vocab",
    targetId: "v1",
    prompt: "食べる",
    correctAnswer: "たべる",
  };
  assert.equal(gradeQuizAnswer(question, "   "), false);
});

// --- 한자 퀴즈(PROMPT 36) ---

test("KANJI_MEANING: 선택한 보기 id가 정답 id와 같을 때만 정답이다(선택지 유무로 객관식 판정)", () => {
  const question: QuizQuestion = {
    quizType: "KANJI_MEANING",
    targetType: "kanji",
    targetId: "k1",
    prompt: "過",
    choices: [
      { id: "correct", text: "exceed, pass time" },
      { id: "wrong-0", text: "traffic, pass through" },
    ],
    correctAnswer: "correct",
  };
  assert.equal(gradeQuizAnswer(question, "correct"), true);
  assert.equal(gradeQuizAnswer(question, "wrong-0"), false);
});

test("KANJI_READING: 등록된 음독/훈독 중 하나만 맞아도 정답이다", () => {
  const question: QuizQuestion = {
    quizType: "KANJI_READING",
    targetType: "kanji",
    targetId: "k1",
    prompt: "過",
    correctAnswer: "カ",
    acceptableAnswers: ["カ", "すごす", "すぎる"],
  };
  assert.equal(gradeQuizAnswer(question, "すごす"), true);
  assert.equal(gradeQuizAnswer(question, "たべる"), false);
});

test("KANJI_SELECT: 선택지가 있는 객관식이라 id로만 채점한다", () => {
  const question: QuizQuestion = {
    quizType: "KANJI_SELECT",
    targetType: "kanji",
    targetId: "k1",
    prompt: "すごす",
    choices: [
      { id: "correct", text: "過ごす" },
      { id: "wrong-0", text: "通ごす" },
    ],
    correctAnswer: "correct",
  };
  assert.equal(gradeQuizAnswer(question, "correct"), true);
  assert.equal(gradeQuizAnswer(question, "過ごす"), false);
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { assignQuizTypes, computeQuizTypeWeights, pickBoostedType } from "@/lib/quiz/distribution";
import type { QuizTypeAccuracySample } from "@/lib/quiz/distribution";
import { VOCAB_QUIZ_TYPES } from "@/lib/quiz/types";
import type { QuizType } from "@/lib/quiz/types";

const VOCAB_QUIZ_TYPE_SET: readonly QuizType[] = VOCAB_QUIZ_TYPES;

function sample(quizType: QuizType, total: number, accuracy: number): QuizTypeAccuracySample {
  return { quizType, total, accuracy };
}

test("개수가 0이면 빈 배열을 반환한다", () => {
  assert.deepEqual(assignQuizTypes(0), []);
});

test("6의 배수 개수를 배정하면 6가지 유형이 정확히 균등하게 나온다", () => {
  const assigned = assignQuizTypes(12, () => 0.5);
  assert.equal(assigned.length, 12);
  const counts = new Map<string, number>();
  for (const quizType of assigned) counts.set(quizType, (counts.get(quizType) ?? 0) + 1);
  for (const quizType of VOCAB_QUIZ_TYPES) assert.equal(counts.get(quizType), 2);
});

test("6으로 나누어떨어지지 않아도 전체 개수는 요청한 만큼 반환된다", () => {
  const assigned = assignQuizTypes(5, () => 0.5);
  assert.equal(assigned.length, 5);
  for (const quizType of assigned) assert.ok(VOCAB_QUIZ_TYPE_SET.includes(quizType));
});

test("동일한 random 시퀀스를 넘기면 항상 같은 배정 결과가 나온다(순수 함수)", () => {
  const fixedRandom = () => 0.3;
  assert.deepEqual(assignQuizTypes(9, fixedRandom), assignQuizTypes(9, fixedRandom));
});

test("weights를 명시적으로 null로 넘겨도 균등 배분으로 동작한다", () => {
  const assigned = assignQuizTypes(12, () => 0.5, VOCAB_QUIZ_TYPES, null);
  const counts = new Map<string, number>();
  for (const quizType of assigned) counts.set(quizType, (counts.get(quizType) ?? 0) + 1);
  for (const quizType of VOCAB_QUIZ_TYPES) assert.equal(counts.get(quizType), 2);
});

// --- computeQuizTypeWeights(PROMPT 39, 계획서 36장) ---

test("데이터가 부족하면(표본 충분한 유형이 2개 미만) null을 반환해 균등 배분으로 폴백한다", () => {
  const samples = [sample("JA_TO_KO", 3, 90)]; // 표본이 5회 미만
  assert.equal(computeQuizTypeWeights(samples, ["JA_TO_KO", "KO_TO_JA", "FURIGANA"]), null);
});

test("허용 유형에 대한 표본이 하나도 없으면 null을 반환한다", () => {
  assert.equal(computeQuizTypeWeights([], ["JA_TO_KO", "KO_TO_JA"]), null);
});

test("정답률이 낮을수록 출제 비중이 커진다", () => {
  const samples = [
    sample("JA_TO_KO", 20, 90),
    sample("KO_TO_JA", 20, 60),
    sample("FURIGANA", 20, 75),
  ];
  const weights = computeQuizTypeWeights(samples, ["JA_TO_KO", "KO_TO_JA", "FURIGANA"]);
  assert.ok(weights);
  // 정답률 낮은 순: KO_TO_JA(60%) > FURIGANA(75%) > JA_TO_KO(90%) — 비중은 그 반대 순서여야 한다.
  assert.ok(weights.KO_TO_JA! > weights.FURIGANA!);
  assert.ok(weights.FURIGANA! > weights.JA_TO_KO!);
  assert.ok(Math.abs(weights.JA_TO_KO! + weights.KO_TO_JA! + weights.FURIGANA! - 1) < 1e-9);
});

test("데이터 없는 유형은 정답률 0%와 동일하게 취급되어(하한 적용) 가장 높은 비중을 받는다", () => {
  const samples = [sample("JA_TO_KO", 20, 90), sample("KO_TO_JA", 20, 85)];
  const weights = computeQuizTypeWeights(samples, ["JA_TO_KO", "KO_TO_JA", "FURIGANA"]);
  assert.ok(weights);
  assert.ok(weights.FURIGANA! > weights.JA_TO_KO!);
  assert.ok(weights.FURIGANA! > weights.KO_TO_JA!);
});

test("극단적 정답률 편차(0% vs 100%, 유형 2개)에서도 어느 쪽도 50%를 넘지 않는다(캡 경계)", () => {
  const samples = [sample("JA_TO_KO", 20, 100), sample("KO_TO_JA", 20, 0)];
  const weights = computeQuizTypeWeights(samples, ["JA_TO_KO", "KO_TO_JA"]);
  assert.ok(weights);
  assert.equal(weights.JA_TO_KO, 0.5);
  assert.equal(weights.KO_TO_JA, 0.5);
});

test("6개 유형 중 하나만 극단적으로 낮으면 그 유형은 50% 캡에서 멈추고 남은 비중이 나머지에 균등 재분배된다", () => {
  const samples: QuizTypeAccuracySample[] = [
    sample("JA_TO_KO", 20, 100),
    sample("KO_TO_JA", 20, 0),
    sample("FURIGANA", 20, 100),
    sample("MULTIPLE_CHOICE", 20, 100),
    sample("FILL_IN_BLANK", 20, 100),
    sample("SENTENCE_TRANSLATION", 20, 100),
  ];
  const weights = computeQuizTypeWeights(samples, VOCAB_QUIZ_TYPES);
  assert.ok(weights);
  assert.equal(weights.KO_TO_JA, 0.5);
  for (const type of VOCAB_QUIZ_TYPES) {
    if (type === "KO_TO_JA") continue;
    assert.ok(Math.abs(weights[type]! - 0.1) < 1e-9);
  }
});

test("어떤 유형도 5% 미만으로는 내려가지 않는다(최소 비중 보장)", () => {
  const samples = VOCAB_QUIZ_TYPES.map((type) => sample(type, 20, type === "JA_TO_KO" ? 20 : 95));
  const weights = computeQuizTypeWeights(samples, VOCAB_QUIZ_TYPES);
  assert.ok(weights);
  for (const type of VOCAB_QUIZ_TYPES) {
    assert.ok(weights[type]! >= 0.05 - 1e-9);
    assert.ok(weights[type]! <= 0.5 + 1e-9);
  }
});

test("assignQuizTypes에 가중치를 넘기면 정답률이 낮은 유형의 배정 개수가 균등 배분보다 늘어난다", () => {
  const samples = [
    sample("JA_TO_KO", 20, 95),
    sample("KO_TO_JA", 20, 20),
    sample("FURIGANA", 20, 90),
    sample("MULTIPLE_CHOICE", 20, 90),
    sample("FILL_IN_BLANK", 20, 90),
    sample("SENTENCE_TRANSLATION", 20, 90),
  ];
  const weights = computeQuizTypeWeights(samples, VOCAB_QUIZ_TYPES);
  const assigned = assignQuizTypes(60, () => 0.5, VOCAB_QUIZ_TYPES, weights);

  const counts = new Map<string, number>();
  for (const quizType of assigned) counts.set(quizType, (counts.get(quizType) ?? 0) + 1);

  assert.equal(assigned.length, 60);
  // 균등 배분이었다면 60/6=10개씩이었을 것 — 가장 약한 유형(KO_TO_JA)은 그보다 많이 나와야 한다.
  assert.ok((counts.get("KO_TO_JA") ?? 0) > 10);
  for (const type of VOCAB_QUIZ_TYPES) {
    assert.ok((counts.get(type) ?? 0) > 0); // 어떤 유형도 완전히 0개가 되지 않는다.
  }
});

// --- pickBoostedType ---

test("pickBoostedType은 가중치가 가장 큰 유형을 반환한다", () => {
  const weights = { JA_TO_KO: 0.1, KO_TO_JA: 0.5, FURIGANA: 0.4 };
  assert.equal(pickBoostedType(weights), "KO_TO_JA");
});

test("pickBoostedType은 가중치가 없으면(데이터 부족 폴백) null을 반환한다", () => {
  assert.equal(pickBoostedType(null), null);
});

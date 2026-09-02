import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_STAGE } from "@/lib/srs/constants";
import { applyReview } from "@/lib/srs/engine";
import type { SrsState } from "@/lib/srs/types";

const NOW = new Date("2026-08-24T00:00:00+09:00");

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

const NEW_STATE: SrsState = {
  intervalStage: 0,
  learningStatus: "NEW",
  correctCount: 0,
  wrongCount: 0,
};

test("첫 학습 GOOD → 1일 후, LEARNING", () => {
  const result = applyReview(NEW_STATE, "GOOD", NOW);
  assert.equal(daysBetween(NOW, result.nextReviewAt), 1);
  assert.equal(result.intervalStage, 1);
  assert.equal(result.learningStatus, "LEARNING");
  assert.equal(result.correctCount, 1);
  assert.equal(result.wrongCount, 0);
});

test("간격 테이블을 따라 GOOD을 반복하면 1→3→7→14→30→60→90일 순서로 진행된다", () => {
  let state = NEW_STATE;
  const expectedDays = [1, 3, 7, 14, 30, 60, 90];
  for (const expected of expectedDays) {
    const result = applyReview(state, "GOOD", NOW);
    assert.equal(daysBetween(NOW, result.nextReviewAt), expected);
    state = { ...state, intervalStage: result.intervalStage };
  }
});

test("모르겠음 → 다음날 재출제, 간격 초기화", () => {
  const advanced: SrsState = { ...NEW_STATE, intervalStage: 4, correctCount: 4 };
  const result = applyReview(advanced, "UNKNOWN", NOW);
  assert.equal(daysBetween(NOW, result.nextReviewAt), 1);
  assert.equal(result.intervalStage, 0);
  assert.equal(result.wrongCount, 1);
});

test("헷갈림 → 2일 후, 단계는 유지된다", () => {
  const advanced: SrsState = { ...NEW_STATE, intervalStage: 3, correctCount: 3 };
  const result = applyReview(advanced, "HARD", NOW);
  assert.equal(daysBetween(NOW, result.nextReviewAt), 2);
  assert.equal(result.intervalStage, 3);
  assert.equal(result.wrongCount, 1);
});

test("쉬움 → 다음 단계보다 한 단계 더 건너뛴 간격이 적용된다", () => {
  const result = applyReview(NEW_STATE, "EASY", NOW);
  // GOOD이었다면 1일이 적용됐을 자리에서, EASY는 한 단계 더 건너뛰어 3일이 적용된다.
  assert.equal(daysBetween(NOW, result.nextReviewAt), 3);
  assert.equal(result.intervalStage, 2);
});

test("최고 간격(90일)에 도달한 뒤 다시 정답을 맞히면 MASTERED로 전이한다", () => {
  const atMax: SrsState = {
    intervalStage: MAX_STAGE,
    learningStatus: "REVIEW",
    correctCount: 6,
    wrongCount: 0,
  };
  const result = applyReview(atMax, "GOOD", NOW);
  assert.equal(result.learningStatus, "MASTERED");
  assert.equal(daysBetween(NOW, result.nextReviewAt), 90);
  // 최고 단계는 더 이상 넘어가지 않고 유지된다.
  assert.equal(result.intervalStage, MAX_STAGE);
});

test("최고 간격에서도 오답을 내면 MASTERED로 전이하지 않는다", () => {
  const atMax: SrsState = {
    intervalStage: MAX_STAGE,
    learningStatus: "MASTERED",
    correctCount: 6,
    wrongCount: 0,
  };
  const result = applyReview(atMax, "UNKNOWN", NOW);
  assert.notEqual(result.learningStatus, "MASTERED");
  assert.equal(result.intervalStage, 0);
});

test("오답률이 40% 이상이고 시행 횟수가 충분하면 WEAK로 전이한다", () => {
  const struggling: SrsState = {
    intervalStage: 1,
    learningStatus: "LEARNING",
    correctCount: 1,
    wrongCount: 1,
  };
  const result = applyReview(struggling, "UNKNOWN", NOW);
  // 누적 1승1패 + 이번 오답 = 1/3 correct, 2/3 wrong → wrongRate 66% ≥ 40%
  assert.equal(result.learningStatus, "WEAK");
});

test("시행 횟수가 너무 적으면(2회 미만 누적) 첫 오답만으로 WEAK로 전이하지 않는다", () => {
  const result = applyReview(NEW_STATE, "UNKNOWN", NOW);
  assert.notEqual(result.learningStatus, "WEAK");
});

test("동일 상태에 동일 평가를 반복 적용해도 항상 같은 결과를 낸다(순수 함수, 정합성)", () => {
  const state: SrsState = {
    intervalStage: 2,
    learningStatus: "REVIEW",
    correctCount: 3,
    wrongCount: 1,
  };
  const first = applyReview(state, "GOOD", NOW);
  const second = applyReview(state, "GOOD", NOW);
  assert.deepEqual(first, second);
});

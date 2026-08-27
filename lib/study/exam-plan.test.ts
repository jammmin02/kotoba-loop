import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computeRecommendedPlan,
  MAX_KANJI_PER_DAY,
  MAX_NEW_WORDS_PER_DAY,
  selectActiveExamGoal,
} from "@/lib/study/exam-plan";

const START_OF_TODAY = new Date("2026-08-25T00:00:00+09:00");

test("활성 목표가 있으면 시험일과 무관하게 그것을 고른다", () => {
  const goals = [
    { id: "past-active", isActive: true, examDate: new Date("2026-08-20T00:00:00+09:00") },
    { id: "future", isActive: false, examDate: new Date("2026-09-01T00:00:00+09:00") },
  ];
  // 활성 목표(past-active)의 시험일이 지났으면 "미래 목표만 후보"라는 필터에 걸려 제외되고,
  // 남은 미래 후보 중에서 골라야 한다.
  assert.equal(selectActiveExamGoal(goals, START_OF_TODAY)?.id, "future");
});

test("활성 목표가 없으면 시험일이 가장 가까운 미래 목표를 고른다", () => {
  const goals = [
    { id: "far", isActive: false, examDate: new Date("2027-01-01T00:00:00+09:00") },
    { id: "near", isActive: false, examDate: new Date("2026-09-01T00:00:00+09:00") },
  ];
  assert.equal(selectActiveExamGoal(goals, START_OF_TODAY)?.id, "near");
});

test("모든 시험이 이미 지났으면 null(폴백)을 반환한다", () => {
  const goals = [{ id: "past", isActive: true, examDate: new Date("2026-08-01T00:00:00+09:00") }];
  assert.equal(selectActiveExamGoal(goals, START_OF_TODAY), null);
});

test("시험이 내일이면 밀린 분량을 하루에 몰아서라도 상한 내로 추천한다", () => {
  const plan = computeRecommendedPlan({
    daysRemaining: 1,
    backlogNewWords: 500,
    backlogReviewWords: 500,
    backlogKanji: 2000,
    availableMinutes: 20,
  });
  assert.ok(plan.newWordsPerDay <= MAX_NEW_WORDS_PER_DAY);
  assert.ok(plan.kanjiPerDay <= MAX_KANJI_PER_DAY);
  assert.ok(plan.newWordsPerDay >= 1);
  assert.ok(Number.isFinite(plan.estimatedMinutes));
});

test("시험이 1년 뒤여도 밀린 분량이 있으면 최소 하루 1개는 추천한다", () => {
  const plan = computeRecommendedPlan({
    daysRemaining: 365,
    backlogNewWords: 5,
    backlogReviewWords: 10,
    backlogKanji: 100,
    availableMinutes: 20,
  });
  assert.equal(plan.newWordsPerDay, 1);
  assert.equal(plan.reviewPerDay, 1);
  assert.equal(plan.kanjiPerDay, 1);
});

test("밀린 분량이 전혀 없으면 추천량도 0이다", () => {
  const plan = computeRecommendedPlan({
    daysRemaining: 30,
    backlogNewWords: 0,
    backlogReviewWords: 0,
    backlogKanji: 0,
    availableMinutes: 20,
  });
  assert.deepEqual(plan, {
    newWordsPerDay: 0,
    reviewPerDay: 0,
    kanjiPerDay: 0,
    sentencePerDay: 0,
    estimatedMinutes: 0,
  });
});

test("가용 시간이 0이어도 계산이 깨지지 않고 최소한의 추천을 만든다", () => {
  const plan = computeRecommendedPlan({
    daysRemaining: 30,
    backlogNewWords: 100,
    backlogReviewWords: 100,
    backlogKanji: 100,
    availableMinutes: 0,
  });
  assert.ok(Number.isFinite(plan.estimatedMinutes));
  assert.ok(plan.newWordsPerDay >= 1);
});

test("가용 시간이 과도하게 커도 밀린 분량보다 더 많이 추천하지 않는다", () => {
  const plan = computeRecommendedPlan({
    daysRemaining: 30,
    backlogNewWords: 30,
    backlogReviewWords: 0,
    backlogKanji: 0,
    availableMinutes: 100000,
  });
  // 30일에 30개 밀렸으면 이상적인 페이스는 하루 1개 — 시간이 남아도 늘리지 않는다.
  assert.equal(plan.newWordsPerDay, 1);
});

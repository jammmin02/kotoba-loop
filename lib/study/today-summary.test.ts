import assert from "node:assert/strict";
import { test } from "node:test";

import {
  categorizeReviewStage,
  estimateStudyMinutes,
  formatEstimatedTimeLabel,
} from "@/lib/study/today-summary";

test("interval_stage 0은 어제 복습으로 분류된다", () => {
  assert.equal(categorizeReviewStage(0), "yesterday");
});

test("interval_stage 1은 3일 복습으로 분류된다", () => {
  assert.equal(categorizeReviewStage(1), "day3");
});

test("interval_stage 2는 7일 복습으로 분류된다", () => {
  assert.equal(categorizeReviewStage(2), "day7");
});

test("interval_stage 3 이상(14/30/60/90일)은 모두 14일 복습으로 묶인다", () => {
  assert.equal(categorizeReviewStage(3), "day14Plus");
  assert.equal(categorizeReviewStage(6), "day14Plus");
});

test("단어가 0개면 예상 시간은 0분이다", () => {
  assert.equal(estimateStudyMinutes(0), 0);
  assert.equal(formatEstimatedTimeLabel(0), "0분");
});

test("단어당 35초 가정으로 예상 시간을 분 단위로 반올림한다", () => {
  // 56개 * 35초 = 1960초 = 32.66...분 → 반올림 33분
  assert.equal(estimateStudyMinutes(56), 33);
  assert.equal(formatEstimatedTimeLabel(56), "약 33분");
});

test("1개 이상이면 반올림 결과가 0분이 되지 않도록 최소 1분을 보장한다", () => {
  assert.equal(estimateStudyMinutes(1), 1);
});

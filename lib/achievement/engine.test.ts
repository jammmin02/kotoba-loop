import assert from "node:assert/strict";
import { test } from "node:test";

import { KANJI_ACHIEVEMENT_SEEDS } from "@/lib/achievement/constants";
import { selectEligibleAchievementCodes } from "@/lib/achievement/engine";

const SEEDS = [
  { code: "A10", conditionValue: 10 },
  { code: "A100", conditionValue: 100 },
  { code: "A500", conditionValue: 500 },
];

test("selectEligibleAchievementCodes는 count 미만인 코드를 제외한다", () => {
  assert.deepEqual(selectEligibleAchievementCodes(SEEDS, 9), []);
});

test("selectEligibleAchievementCodes는 정확히 경계값에 도달한 코드를 포함한다", () => {
  assert.deepEqual(selectEligibleAchievementCodes(SEEDS, 10), ["A10"]);
});

test("selectEligibleAchievementCodes는 여러 단계를 한 번에 넘었을 때 전부 반환한다", () => {
  assert.deepEqual(selectEligibleAchievementCodes(SEEDS, 500), ["A10", "A100", "A500"]);
});

test("selectEligibleAchievementCodes는 조건을 만족하는 코드가 없으면 빈 배열을 반환한다", () => {
  assert.deepEqual(selectEligibleAchievementCodes(SEEDS, 0), []);
});

// --- 한자 업적(PROMPT 27/36) 경계값 — 실제 시딩 값(100/500/1,000/2,136)으로 검증한다. ---

test("한자 업적: 99번째까지는 아무것도 해제되지 않는다", () => {
  assert.deepEqual(selectEligibleAchievementCodes(KANJI_ACHIEVEMENT_SEEDS, 99), []);
});

test("한자 업적: 정확히 100번째에 '한자 초보'만 해제된다", () => {
  assert.deepEqual(selectEligibleAchievementCodes(KANJI_ACHIEVEMENT_SEEDS, 100), ["KANJI_100"]);
});

test("한자 업적: 정확히 500번째에 '한자 중급'까지 해제된다", () => {
  assert.deepEqual(selectEligibleAchievementCodes(KANJI_ACHIEVEMENT_SEEDS, 500), [
    "KANJI_100",
    "KANJI_500",
  ]);
});

test("한자 업적: 999번째까지는 '한자 고급'이 해제되지 않는다", () => {
  assert.deepEqual(selectEligibleAchievementCodes(KANJI_ACHIEVEMENT_SEEDS, 999), [
    "KANJI_100",
    "KANJI_500",
  ]);
});

test("한자 업적: 정확히 1,000번째에 '한자 고급'까지 해제된다", () => {
  assert.deepEqual(selectEligibleAchievementCodes(KANJI_ACHIEVEMENT_SEEDS, 1000), [
    "KANJI_100",
    "KANJI_500",
    "KANJI_1000",
  ]);
});

test("한자 업적: 2,135번째까지는 MASTER가 해제되지 않는다", () => {
  const codes = selectEligibleAchievementCodes(KANJI_ACHIEVEMENT_SEEDS, 2135);
  assert.ok(!codes.includes("KANJI_2136_MASTER"));
});

test("한자 업적: 정확히 2,136번째(상용한자 전량)에 MASTER까지 전부 해제된다", () => {
  assert.deepEqual(selectEligibleAchievementCodes(KANJI_ACHIEVEMENT_SEEDS, 2136), [
    "KANJI_100",
    "KANJI_500",
    "KANJI_1000",
    "KANJI_2136_MASTER",
  ]);
});

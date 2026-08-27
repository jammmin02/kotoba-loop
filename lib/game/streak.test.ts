import assert from "node:assert/strict";
import { test } from "node:test";

import { applyStreakUpdate, getDisplayStreak } from "@/lib/game/streak";

// 실제 KST 자정 여부는 중요하지 않다 — 두 함수 모두 addKstDays(정확히 24시간 차이)로만
// 날짜를 비교하므로, 호출부(lib/game/grant.ts)가 이미 startOfKstDay로 정규화한 값을 넘긴다는
// 전제만 지키면 임의의 기준 시각으로도 동일하게 검증된다.
const DAY_MS = 24 * 60 * 60 * 1000;
const TODAY = new Date("2026-08-25T00:00:00Z");
const YESTERDAY = new Date(TODAY.getTime() - DAY_MS);
const TWO_DAYS_AGO = new Date(TODAY.getTime() - 2 * DAY_MS);

test("첫 학습(last_studied_date 없음)이면 스트릭이 1로 시작한다", () => {
  const result = applyStreakUpdate(
    { currentStreak: 0, longestStreak: 0, lastStudiedDate: null },
    TODAY,
  );
  assert.deepEqual(result, { currentStreak: 1, longestStreak: 1, freezeConsumed: false });
});

test("어제 학습했으면 오늘 완료 시 스트릭이 1 증가한다", () => {
  const result = applyStreakUpdate(
    { currentStreak: 5, longestStreak: 5, lastStudiedDate: YESTERDAY },
    TODAY,
  );
  assert.deepEqual(result, { currentStreak: 6, longestStreak: 6, freezeConsumed: false });
});

test("하루 건너뛰고(그제 학습) 프리즈가 없으면 스트릭이 1로 초기화된다", () => {
  const result = applyStreakUpdate(
    { currentStreak: 10, longestStreak: 12, lastStudiedDate: TWO_DAYS_AGO },
    TODAY,
  );
  assert.deepEqual(result, { currentStreak: 1, longestStreak: 12, freezeConsumed: false });
});

test("하루만 건너뛰고(그제 학습) 프리즈가 있으면 자동 소비되어 스트릭이 이어진다", () => {
  const result = applyStreakUpdate(
    { currentStreak: 10, longestStreak: 12, lastStudiedDate: TWO_DAYS_AGO },
    TODAY,
    1,
  );
  assert.deepEqual(result, { currentStreak: 11, longestStreak: 12, freezeConsumed: true });
});

test("이틀 이상 건너뛰면 프리즈가 있어도 스트릭이 초기화된다", () => {
  const threeDaysAgo = new Date(TODAY.getTime() - 3 * DAY_MS);
  const result = applyStreakUpdate(
    { currentStreak: 10, longestStreak: 12, lastStudiedDate: threeDaysAgo },
    TODAY,
    1,
  );
  assert.deepEqual(result, { currentStreak: 1, longestStreak: 12, freezeConsumed: false });
});

test("프리즈가 있어도 어제 학습해 이미 이어지고 있으면 소비하지 않는다", () => {
  const result = applyStreakUpdate(
    { currentStreak: 5, longestStreak: 5, lastStudiedDate: YESTERDAY },
    TODAY,
    2,
  );
  assert.deepEqual(result, { currentStreak: 6, longestStreak: 6, freezeConsumed: false });
});

test("최고 기록은 현재 스트릭이 넘어설 때만 갱신된다", () => {
  const result = applyStreakUpdate(
    { currentStreak: 3, longestStreak: 20, lastStudiedDate: YESTERDAY },
    TODAY,
  );
  assert.deepEqual(result, { currentStreak: 4, longestStreak: 20, freezeConsumed: false });
});

test("조회 시점: last_studied_date가 오늘이면 저장된 스트릭을 그대로 보여준다", () => {
  assert.equal(getDisplayStreak(7, TODAY, TODAY), 7);
});

test("조회 시점: last_studied_date가 어제면(오늘 미학습, 위험 상태) 저장된 스트릭을 그대로 보여준다", () => {
  assert.equal(getDisplayStreak(7, YESTERDAY, TODAY), 7);
});

test("조회 시점: 하루 이상 건너뛰었으면 아직 DB가 갱신되지 않았어도 0으로 보여준다", () => {
  assert.equal(getDisplayStreak(7, TWO_DAYS_AGO, TODAY), 0);
});

test("조회 시점: 한 번도 학습한 적 없으면 0이다", () => {
  assert.equal(getDisplayStreak(0, null, TODAY), 0);
});

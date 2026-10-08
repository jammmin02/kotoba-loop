import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeDailyAllowance, takeWithinAllowance } from "./daily-limits";

describe("computeDailyAllowance", () => {
  it("오늘 한 만큼을 목표에서 뺀 몫이 남는다", () => {
    assert.deepEqual(
      computeDailyAllowance({
        newTarget: 10,
        reviewLimit: 50,
        newIntroducedToday: 3,
        reviewedToday: 20,
      }),
      { newRemaining: 7, reviewRemaining: 30 },
    );
  });

  it("목표를 넘겨 학습해도 남은 몫은 0이다(음수가 되지 않는다)", () => {
    assert.deepEqual(
      computeDailyAllowance({
        newTarget: 10,
        reviewLimit: 50,
        newIntroducedToday: 14,
        reviewedToday: 80,
      }),
      { newRemaining: 0, reviewRemaining: 0 },
    );
  });

  it("복습 상한이 null이면 복습은 제한 없음이다", () => {
    const allowance = computeDailyAllowance({
      newTarget: 10,
      reviewLimit: null,
      newIntroducedToday: 0,
      reviewedToday: 999,
    });
    assert.equal(allowance.reviewRemaining, null);
    assert.equal(allowance.newRemaining, 10);
  });

  it("아직 아무것도 안 했으면 목표 전체가 남는다", () => {
    assert.deepEqual(
      computeDailyAllowance({
        newTarget: 5,
        reviewLimit: 100,
        newIntroducedToday: 0,
        reviewedToday: 0,
      }),
      { newRemaining: 5, reviewRemaining: 100 },
    );
  });
});

describe("takeWithinAllowance", () => {
  it("남은 몫만큼 앞에서부터 자른다", () => {
    assert.deepEqual(takeWithinAllowance([1, 2, 3, 4], 2), [1, 2]);
    assert.deepEqual(takeWithinAllowance([1, 2], 5), [1, 2]);
    assert.deepEqual(takeWithinAllowance([1, 2, 3], 0), []);
  });

  it("null이면 전부 돌려준다", () => {
    assert.deepEqual(takeWithinAllowance([1, 2, 3], null), [1, 2, 3]);
  });
});

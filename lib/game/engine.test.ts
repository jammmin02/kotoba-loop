import assert from "node:assert/strict";
import { test } from "node:test";

import { applyExpGain, requiredExpForLevel } from "@/lib/game/engine";

test("requiredExpForLevel은 50 × level이다", () => {
  assert.equal(requiredExpForLevel(1), 50);
  assert.equal(requiredExpForLevel(9), 450);
});

test("레벨업에 못 미치면 exp만 누적되고 레벨은 그대로다", () => {
  const result = applyExpGain({ level: 1, exp: 10 }, 5);
  assert.deepEqual(result, { level: 1, exp: 15, leveledUp: false });
});

test("정확히 필요 EXP에 도달하면 레벨업하고 exp는 0으로 이월된다(경계값)", () => {
  const result = applyExpGain({ level: 1, exp: 49 }, 1);
  assert.deepEqual(result, { level: 2, exp: 0, leveledUp: true });
});

test("초과분 EXP는 다음 레벨로 이월된다", () => {
  const result = applyExpGain({ level: 1, exp: 40 }, 20);
  // 1레벨 필요 50 → 40+20=60, 60-50=10 초과분이 레벨2로 이월
  assert.deepEqual(result, { level: 2, exp: 10, leveledUp: true });
});

test("한 번에 여러 레벨을 넘는 경우도 정확히 처리한다", () => {
  const result = applyExpGain({ level: 1, exp: 0 }, 130);
  // 1레벨(50) 소모 → 80 남음, 2레벨(100) 미만이라 정지
  assert.deepEqual(result, { level: 2, exp: 80, leveledUp: true });
});

test("레벨업이 없으면 leveledUp은 false다", () => {
  const result = applyExpGain({ level: 3, exp: 0 }, 1);
  assert.equal(result.leveledUp, false);
  assert.equal(result.level, 3);
});

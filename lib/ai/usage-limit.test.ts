import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluateAiLimits } from "./usage-limit-policy";

const limits = { perMinuteCalls: 5, perDayCalls: 50, perDayTokens: 1000 };

describe("evaluateAiLimits", () => {
  it("한도 안이면 null", () => {
    assert.equal(evaluateAiLimits({ minuteCalls: 4, dayCalls: 49, dayTokens: 999 }, limits), null);
  });
  it("분당 호출 한도에 도달하면 메시지", () => {
    assert.match(
      evaluateAiLimits({ minuteCalls: 5, dayCalls: 5, dayTokens: 10 }, limits) ?? "",
      /잠시 후/,
    );
  });
  it("일일 호출·토큰 한도에 도달하면 메시지", () => {
    assert.match(
      evaluateAiLimits({ minuteCalls: 0, dayCalls: 50, dayTokens: 0 }, limits) ?? "",
      /오늘/,
    );
    assert.match(
      evaluateAiLimits({ minuteCalls: 0, dayCalls: 1, dayTokens: 1000 }, limits) ?? "",
      /오늘/,
    );
  });
});

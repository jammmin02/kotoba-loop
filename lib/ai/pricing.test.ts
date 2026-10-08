import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { estimateCostUsd } from "./pricing";

describe("estimateCostUsd", () => {
  it("캐시가 없으면 입력·출력 단가만 쓴다", () => {
    assert.equal(
      estimateCostUsd("claude-sonnet-5", { inputTokens: 1_000_000, outputTokens: 0 }),
      3,
    );
    assert.equal(
      estimateCostUsd("claude-sonnet-5", { inputTokens: 0, outputTokens: 1_000_000 }),
      15,
    );
  });

  it("캐시 읽기는 10%, 캐시 쓰기는 125%로 계산한다", () => {
    const read = estimateCostUsd("claude-sonnet-5", {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 1_000_000,
    });
    const write = estimateCostUsd("claude-sonnet-5", {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 1_000_000,
    });
    assert.ok(Math.abs(read - 0.3) < 1e-9);
    assert.ok(Math.abs(write - 3.75) < 1e-9);
  });

  it("알 수 없는 모델은 Sonnet 단가로 본다", () => {
    assert.equal(estimateCostUsd("unknown-model", { inputTokens: 1_000_000, outputTokens: 0 }), 3);
  });
});

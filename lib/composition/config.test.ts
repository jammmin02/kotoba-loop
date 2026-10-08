import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSessionComplete, resolveTargetCount, summarizeAttempts } from "./config";

describe("resolveTargetCount", () => {
  it("기본 모드는 5문제", () => assert.equal(resolveTargetCount("DEFAULT"), 5));
  it("무한 모드는 null", () => assert.equal(resolveTargetCount("ENDLESS", 10), null));
  it("사용자 지정은 값을 그대로, 범위 밖이면 보정", () => {
    assert.equal(resolveTargetCount("CUSTOM", 12), 12);
    assert.equal(resolveTargetCount("CUSTOM", 0), 1);
    assert.equal(resolveTargetCount("CUSTOM", 999), 30);
    assert.equal(resolveTargetCount("CUSTOM", null), 1);
  });
});

describe("isSessionComplete", () => {
  it("무한 모드는 자동 종료되지 않는다", () => assert.equal(isSessionComplete(null, 1000), false));
  it("목표 수에 도달하면 종료", () => {
    assert.equal(isSessionComplete(5, 4), false);
    assert.equal(isSessionComplete(5, 5), true);
  });
});

describe("summarizeAttempts", () => {
  it("빈 배열이면 0", () => assert.equal(summarizeAttempts([]).averageScore, 0));
  it("평균과 정답 수를 계산", () => {
    const s = summarizeAttempts([
      {
        score: 90,
        grammar_score: 90,
        vocabulary_score: 80,
        naturalness_score: 100,
        is_accepted: true,
      },
      {
        score: 40,
        grammar_score: 30,
        vocabulary_score: 50,
        naturalness_score: 40,
        is_accepted: false,
      },
    ]);
    assert.deepEqual(s, {
      answeredCount: 2,
      acceptedCount: 1,
      averageScore: 65,
      averageGrammar: 60,
      averageVocabulary: 65,
      averageNaturalness: 70,
    });
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildConversationStats, type ConversationStatsInput } from "./stats";

const NOW = new Date("2026-10-08T03:00:00.000Z");

function row(overrides: Partial<ConversationStatsInput> = {}): ConversationStatsInput {
  return {
    created_at: NOW,
    score: 80,
    grammar_score: 80,
    vocabulary_score: 80,
    naturalness_score: 80,
    is_accepted: true,
    hint_used: false,
    feedback: { items: [] },
    scenario: "점원",
    vocab_level: "N4",
    topic: "카페",
    ...overrides,
  };
}

describe("buildConversationStats", () => {
  it("기록이 없으면 합계가 0이고 14일 칸은 채워 둔다", () => {
    const stats = buildConversationStats([], NOW);
    assert.equal(stats.totals.attemptCount, 0);
    assert.equal(stats.daily.length, 14);
  });

  it("상대/세부 상황별로 묶고 상대는 지정한 순서를 따른다", () => {
    const stats = buildConversationStats(
      [row({ scenario: "상사", topic: "휴가 신청", score: 60 }), row(), row({ score: 100 })],
      NOW,
      { scenarioOrder: ["점원", "상사"] },
    );
    assert.deepEqual(
      stats.bySituation.map((r) => [r.label, r.count, r.averageScore]),
      [
        ["점원", 2, 90],
        ["상사", 1, 60],
      ],
    );
    assert.equal(stats.byCompositionLevel.length, 2);
  });

  it("경어 오류는 오류 유형으로 센다", () => {
    const stats = buildConversationStats(
      [row({ feedback: { items: [{ kind: "경어" }, { kind: "실제 표현" }] } })],
      NOW,
    );
    assert.deepEqual(stats.mistakeKinds, [{ kind: "경어", count: 1 }]);
    assert.equal(stats.naturalSuggestionCount, 1);
  });
});

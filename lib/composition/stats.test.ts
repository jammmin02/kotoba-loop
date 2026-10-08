import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCompositionStats, extractFeedbackKinds, type StatsAttemptInput } from "./stats";

const NOW = new Date("2026-10-08T03:00:00Z"); // KST 2026-10-08 12:00

function attempt(overrides: Partial<StatsAttemptInput> = {}): StatsAttemptInput {
  return {
    created_at: NOW,
    score: 80,
    grammar_score: 80,
    vocabulary_score: 80,
    naturalness_score: 80,
    is_accepted: true,
    hint_used: false,
    feedback: { items: [] },
    situation: "일상",
    vocab_level: "N4",
    composition_level: "단문",
    ...overrides,
  };
}

describe("extractFeedbackKinds", () => {
  it("형태가 이상한 JSON은 빈 배열로 처리한다", () => {
    assert.deepEqual(extractFeedbackKinds(null), []);
    assert.deepEqual(extractFeedbackKinds("x"), []);
    assert.deepEqual(extractFeedbackKinds({ items: "x" }), []);
    assert.deepEqual(extractFeedbackKinds({ items: [null, { kind: 1 }, { kind: "문법" }] }), [
      "문법",
    ]);
  });
});

describe("buildCompositionStats", () => {
  it("기록이 없으면 모두 0이고 일별은 14칸", () => {
    const s = buildCompositionStats([], NOW);
    assert.equal(s.totals.attemptCount, 0);
    assert.equal(s.totals.acceptedRate, 0);
    assert.equal(s.daily.length, 14);
    assert.ok(s.daily.every((d) => d.count === 0 && d.averageScore === null));
    assert.equal(s.daily[13].date, "2026-10-08");
    assert.equal(s.daily[0].date, "2026-09-25");
  });

  it("평균, 정답률, 힌트 비율을 계산한다", () => {
    const s = buildCompositionStats(
      [
        attempt({ score: 100, hint_used: true }),
        attempt({ score: 40, is_accepted: false, grammar_score: 20 }),
      ],
      NOW,
    );
    assert.equal(s.totals.averageScore, 70);
    assert.equal(s.totals.acceptedRate, 50);
    assert.equal(s.totals.hintRate, 50);
    assert.equal(s.totals.averageGrammar, 50);
  });

  it("일별 집계는 KST 날짜 기준이다", () => {
    // UTC 2026-10-07 16:00 = KST 2026-10-08 01:00
    const s = buildCompositionStats(
      [attempt({ created_at: new Date("2026-10-07T16:00:00Z"), score: 90 })],
      NOW,
    );
    const today = s.daily[13];
    assert.equal(today.date, "2026-10-08");
    assert.equal(today.count, 1);
    assert.equal(today.averageScore, 90);
  });

  it("실제 표현은 오류 유형에서 빼고 따로 센다", () => {
    const s = buildCompositionStats(
      [
        attempt({
          feedback: { items: [{ kind: "문법" }, { kind: "조사" }, { kind: "실제 표현" }] },
        }),
        attempt({ feedback: { items: [{ kind: "문법" }] } }),
      ],
      NOW,
    );
    assert.deepEqual(s.mistakeKinds, [
      { kind: "문법", count: 2 },
      { kind: "조사", count: 1 },
    ]);
    assert.equal(s.naturalSuggestionCount, 1);
  });

  it("항목별은 지정한 순서대로, 없으면 문제 수가 많은 순", () => {
    const rows = [
      attempt({ situation: "직장", score: 60 }),
      attempt({ situation: "일상", score: 80 }),
      attempt({ situation: "일상", score: 100 }),
    ];
    const ordered = buildCompositionStats(rows, NOW, { order: { situation: ["직장", "일상"] } });
    assert.deepEqual(
      ordered.bySituation.map((r) => r.label),
      ["직장", "일상"],
    );
    const byCount = buildCompositionStats(rows, NOW);
    assert.equal(byCount.bySituation[0].label, "일상");
    assert.equal(byCount.bySituation[0].averageScore, 90);
  });
});

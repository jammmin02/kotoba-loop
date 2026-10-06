import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describeChanges } from "./diff";

const labels = { reading: "읽기", meanings: "뜻", jlpt: "JLPT" };

describe("describeChanges", () => {
  it("returns null when nothing changed", () => {
    const v = { reading: "たべる", meanings: ["먹다"], jlpt: "N5" };
    assert.equal(describeChanges(v, { ...v, meanings: ["먹다"] }, labels), null);
  });

  it("lists only the changed fields with before and after", () => {
    const result = describeChanges(
      { reading: "たべる", meanings: ["먹다"], jlpt: "N5" },
      { reading: "たべる", meanings: ["먹다", "식사하다"], jlpt: null },
      labels,
    );
    assert.equal(result, "뜻: 먹다 → 먹다 / 식사하다; JLPT: N5 → (없음)");
  });

  it("truncates very long summaries", () => {
    const long = "가".repeat(2000);
    const result = describeChanges({ reading: "a" }, { reading: long }, { reading: "읽기" });
    assert.ok(result !== null && result.length <= 1000);
    assert.ok(result.endsWith("…"));
  });
});

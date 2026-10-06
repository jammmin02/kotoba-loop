import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeEmailDomain } from "./email-domain";

describe("normalizeEmailDomain", () => {
  it("adds the @ and lowercases", () => {
    assert.equal(normalizeEmailDomain("g.yju.ac.kr"), "@g.yju.ac.kr");
    assert.equal(normalizeEmailDomain("  @G.YJU.AC.KR "), "@g.yju.ac.kr");
  });

  it("rejects values that are not a domain", () => {
    assert.equal(normalizeEmailDomain(""), null);
    assert.equal(normalizeEmailDomain("@"), null);
    assert.equal(normalizeEmailDomain("localhost"), null);
    assert.equal(normalizeEmailDomain("a b.com"), null);
    assert.equal(normalizeEmailDomain("user@example.com"), null);
    assert.equal(normalizeEmailDomain("-bad.com"), null);
  });
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { formatNextReviewLabel } from "./interval-label";

test("1일은 내일, 그 외는 N일 뒤로 표시한다", () => {
  assert.equal(formatNextReviewLabel(1), "내일");
  assert.equal(formatNextReviewLabel(2), "2일 뒤");
  assert.equal(formatNextReviewLabel(90), "90일 뒤");
});

test("0일 이하는 오늘로 표시한다", () => {
  assert.equal(formatNextReviewLabel(0), "오늘");
});

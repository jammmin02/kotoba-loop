import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findSharedVocabularyIds, planVocabularyEdit, planVocabularyRemoval } from "./plan";

describe("findSharedVocabularyIds", () => {
  it("다른 사용자의 UserVocabulary와 단어장 항목을 합쳐 공유 단어로 본다", () => {
    const shared = findSharedVocabularyIds(["a", "b"], ["b", "c"]);
    assert.deepEqual([...shared].sort(), ["a", "b", "c"]);
  });

  it("다른 사용자가 없으면 빈 집합이다", () => {
    assert.equal(findSharedVocabularyIds([], []).size, 0);
  });
});

describe("planVocabularyRemoval", () => {
  it("공유되지 않은 단어만 행 삭제 대상으로 둔다", () => {
    const plan = planVocabularyRemoval(["a", "b", "c"], new Set(["b"]));
    assert.deepEqual(plan, { deleteIds: ["a", "c"], unlinkIds: ["b"] });
  });

  it("전부 공유 중이면 행은 하나도 지우지 않는다", () => {
    const plan = planVocabularyRemoval(["a", "b"], new Set(["a", "b", "x"]));
    assert.deepEqual(plan, { deleteIds: [], unlinkIds: ["a", "b"] });
  });

  it("중복 id는 한 번만 처리한다", () => {
    const plan = planVocabularyRemoval(["a", "a", "b"], new Set(["b"]));
    assert.deepEqual(plan, { deleteIds: ["a"], unlinkIds: ["b"] });
  });

  it("빈 입력은 빈 계획이다", () => {
    assert.deepEqual(planVocabularyRemoval([], new Set(["a"])), { deleteIds: [], unlinkIds: [] });
  });
});

describe("planVocabularyEdit", () => {
  it("공유 중이면 copy-on-write, 아니면 제자리 수정이다", () => {
    assert.equal(planVocabularyEdit(true), "copy-on-write");
    assert.equal(planVocabularyEdit(false), "in-place");
  });
});

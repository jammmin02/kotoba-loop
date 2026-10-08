import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { filterHiddenWords, isBookHidden, isWordHidden } from "./hidden";

import type { HiddenSpec } from "./hidden";

describe("isWordHidden", () => {
  it("삭제 대기 중인 단어는 어느 목록에서나 숨긴다", () => {
    const specs: HiddenSpec[] = [{ kind: "word", wordId: "w1" }];
    assert.equal(isWordHidden({ id: "w1" }, specs), true);
    assert.equal(isWordHidden({ id: "w1", bookIds: ["b1"] }, specs, "b2"), true);
    assert.equal(isWordHidden({ id: "w2" }, specs), false);
  });

  it("단어장에서 빼는 단어는 그 단어장 목록에서 숨긴다", () => {
    const specs: HiddenSpec[] = [{ kind: "book-words", bookId: "b1", wordIds: ["w1", "w2"] }];
    assert.equal(isWordHidden({ id: "w1", bookIds: ["b1", "b2"] }, specs, "b1"), true);
    assert.equal(isWordHidden({ id: "w3", bookIds: ["b1"] }, specs, "b1"), false);
  });

  it("다른 단어장에도 있는 단어는 전체 목록과 다른 단어장 목록에서 계속 보인다", () => {
    const specs: HiddenSpec[] = [{ kind: "book-words", bookId: "b1", wordIds: ["w1"] }];
    assert.equal(isWordHidden({ id: "w1", bookIds: ["b1", "b2"] }, specs), false);
    assert.equal(isWordHidden({ id: "w1", bookIds: ["b1", "b2"] }, specs, "b2"), false);
  });

  it("속한 모든 단어장에서 빠져 단어 자체가 사라지는 경우에는 전체 목록에서도 숨긴다", () => {
    const only: HiddenSpec[] = [{ kind: "book-words", bookId: "b1", wordIds: ["w1"] }];
    assert.equal(isWordHidden({ id: "w1", bookIds: ["b1"] }, only), true);

    const both: HiddenSpec[] = [
      { kind: "book-words", bookId: "b1", wordIds: ["w1"] },
      { kind: "book-words", bookId: "b2", wordIds: ["w1"] },
    ];
    assert.equal(isWordHidden({ id: "w1", bookIds: ["b1", "b2"] }, both), true);
  });

  it("소속 단어장을 모르면 단어장 범위 밖에서는 숨기지 않는다", () => {
    const specs: HiddenSpec[] = [{ kind: "book-words", bookId: "b1", wordIds: ["w1"] }];
    assert.equal(isWordHidden({ id: "w1" }, specs), false);
    assert.equal(isWordHidden({ id: "w1", bookIds: [] }, specs), false);
  });

  it("대기 항목이 없으면 아무것도 숨기지 않는다", () => {
    assert.equal(isWordHidden({ id: "w1", bookIds: ["b1"] }, []), false);
  });
});

describe("isBookHidden", () => {
  it("삭제 대기 중인 단어장만 숨긴다", () => {
    const specs: HiddenSpec[] = [{ kind: "book", bookId: "b1" }];
    assert.equal(isBookHidden("b1", specs), true);
    assert.equal(isBookHidden("b2", specs), false);
  });
});

describe("filterHiddenWords", () => {
  const words = [
    { id: "w1", bookIds: ["b1"] },
    { id: "w2", bookIds: ["b1", "b2"] },
    { id: "w3", bookIds: ["b2"] },
  ];

  it("숨길 항목이 없으면 같은 배열을 돌려준다", () => {
    assert.equal(filterHiddenWords(words, []), words);
  });

  it("숨겨야 하는 단어만 걸러낸다", () => {
    const specs: HiddenSpec[] = [
      { kind: "word", wordId: "w3" },
      { kind: "book-words", bookId: "b1", wordIds: ["w1", "w2"] },
    ];
    // 전체 목록: w1은 b1에서만 빠져 사라지고, w3은 삭제 대기 → w2만 남는다
    assert.deepEqual(
      filterHiddenWords(words, specs).map((word) => word.id),
      ["w2"],
    );
    // b1 목록: w1·w2 모두 b1에서 빠지므로 안 보인다(w3은 b1 소속이 아니라 원래 없음)
    assert.deepEqual(
      filterHiddenWords(
        words.filter((word) => word.bookIds.includes("b1")),
        specs,
        "b1",
      ).map((word) => word.id),
      [],
    );
  });

  it("수천 개를 빼는 요청도 빠르게 걸러낸다", () => {
    const many = Array.from({ length: 5000 }, (_, i) => ({ id: `w${i}`, bookIds: ["b1"] }));
    const specs: HiddenSpec[] = [
      { kind: "book-words", bookId: "b1", wordIds: many.map((word) => word.id) },
    ];
    const started = performance.now();
    const remaining = filterHiddenWords(many, specs, "b1");
    assert.equal(remaining.length, 0);
    assert.ok(performance.now() - started < 200);
  });
});

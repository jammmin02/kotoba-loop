import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveFlashcardShortcut } from "./flashcard-shortcuts";

import type { FlashcardShortcutInput } from "./flashcard-shortcuts";

const BASE: FlashcardShortcutInput = {
  key: " ",
  repeat: false,
  isComposing: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  targetIsEditable: false,
  targetIsInteractive: false,
  modalOpen: false,
  isFlipped: false,
  isSubmitting: false,
};

const press = (overrides: Partial<FlashcardShortcutInput>) =>
  resolveFlashcardShortcut({ ...BASE, ...overrides });

describe("resolveFlashcardShortcut", () => {
  it("앞면에서 Space/Enter는 카드를 뒤집는다", () => {
    assert.deepEqual(press({ key: " " }), { type: "flip" });
    assert.deepEqual(press({ key: "Enter" }), { type: "flip" });
  });

  it("뒤집힌 뒤의 Space/Enter는 무시한다(실수로 앞면으로 돌아가지 않게)", () => {
    assert.equal(press({ key: " ", isFlipped: true }), null);
    assert.equal(press({ key: "Enter", isFlipped: true }), null);
  });

  it("뒤집힌 뒤 1~4는 버튼 순서대로 채점한다", () => {
    const grades = ["1", "2", "3", "4"].map((key) => press({ key, isFlipped: true }));
    assert.deepEqual(grades, [
      { type: "grade", grade: "UNKNOWN" },
      { type: "grade", grade: "HARD" },
      { type: "grade", grade: "GOOD" },
      { type: "grade", grade: "EASY" },
    ]);
  });

  it("뒤집기 전이나 채점 요청 중에는 숫자 키를 무시한다", () => {
    assert.equal(press({ key: "3", isFlipped: false }), null);
    assert.equal(press({ key: "3", isFlipped: true, isSubmitting: true }), null);
  });

  it("버튼/링크에 포커스가 있으면 Space/Enter는 브라우저 기본 동작에 맡긴다", () => {
    assert.equal(press({ key: " ", targetIsInteractive: true }), null);
    assert.equal(press({ key: "Enter", targetIsInteractive: true }), null);
  });

  it("버튼에 포커스가 있어도 숫자 채점은 동작한다", () => {
    assert.deepEqual(press({ key: "3", isFlipped: true, targetIsInteractive: true }), {
      type: "grade",
      grade: "GOOD",
    });
  });

  it("입력 중, IME 조합 중, 모달 위, 키 반복, 수정키 조합에서는 무시한다", () => {
    assert.equal(press({ targetIsEditable: true }), null);
    assert.equal(press({ key: "1", isFlipped: true, targetIsEditable: true }), null);
    assert.equal(press({ isComposing: true }), null);
    assert.equal(press({ modalOpen: true }), null);
    assert.equal(press({ repeat: true }), null);
    assert.equal(press({ key: "1", isFlipped: true, ctrlKey: true }), null);
    assert.equal(press({ key: "1", isFlipped: true, metaKey: true }), null);
    assert.equal(press({ key: "1", isFlipped: true, altKey: true }), null);
  });

  it("관련 없는 키는 무시한다", () => {
    assert.equal(press({ key: "a" }), null);
    assert.equal(press({ key: "5", isFlipped: true }), null);
  });
});

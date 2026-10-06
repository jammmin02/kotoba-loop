import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SAVED_SESSION_TTL_MS,
  clearSavedSession,
  formatSavedAgo,
  loadAnySavedSession,
  loadSavedSession,
  saveSession,
} from "@/lib/study/saved-session";
import type { FlashcardSnapshot, QuizSnapshot } from "@/lib/study/saved-session";

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, String(value)),
  };
}

const card = {
  vocabularyId: "v1",
  word: "食べる",
  reading: "たべる",
  meanings: ["먹다"],
  examples: [],
};

function flashcard(currentIndex: number, count = 3): FlashcardSnapshot {
  return {
    kind: "flashcard",
    mode: "custom",
    queue: Array.from({ length: count }, () => card),
    currentIndex,
    tally: { UNKNOWN: 0, HARD: 0, GOOD: currentIndex, EASY: 0 },
    missedVocabularyIds: [],
    requeueCounts: {},
  };
}

const quiz: QuizSnapshot = {
  kind: "quiz",
  questions: [
    {
      quizType: "JA_TO_KO",
      targetType: "vocab",
      targetId: "v1",
      prompt: "食べる",
      correctAnswer: "먹다",
    },
  ],
  currentIndex: 0,
  correctCount: 0,
  wrongCount: 0,
  missedTargetIds: [],
  requeueCounts: {},
};

test("저장한 세션을 그대로 다시 읽는다", () => {
  const storage = fakeStorage();
  saveSession(
    "custom",
    { snapshot: flashcard(1), label: "플래시카드", meta: { a: 1 } },
    1000,
    storage,
  );

  const loaded = loadSavedSession("custom", "flashcard", 2000, storage);
  assert.equal(loaded?.snapshot.currentIndex, 1);
  assert.equal(loaded?.label, "플래시카드");
  assert.deepEqual(loaded?.meta, { a: 1 });
});

test("7일이 지난 저장본은 읽지 못하고 지워진다", () => {
  const storage = fakeStorage();
  saveSession("custom", { snapshot: flashcard(1) }, 0, storage);

  assert.ok(loadSavedSession("custom", "flashcard", SAVED_SESSION_TTL_MS, storage));
  assert.equal(loadSavedSession("custom", "flashcard", SAVED_SESSION_TTL_MS + 1, storage), null);
  assert.equal(storage.length, 0);
});

test("다른 종류의 저장본은 읽지 않되 지우지도 않는다", () => {
  const storage = fakeStorage();
  saveSession("custom", { snapshot: quiz }, 0, storage);

  assert.equal(loadSavedSession("custom", "flashcard", 0, storage), null);
  assert.equal(storage.length, 1);
  assert.equal(loadAnySavedSession("custom", 0, storage)?.snapshot.kind, "quiz");
});

test("깨졌거나 이미 끝난 저장본은 버린다", () => {
  const storage = fakeStorage();
  storage.setItem("kotoba-resume:a", "{not json");
  assert.equal(loadSavedSession("a", "quiz", 0, storage), null);
  assert.equal(storage.getItem("kotoba-resume:a"), null);

  saveSession("b", { snapshot: flashcard(3, 3) }, 0, storage);
  assert.equal(loadSavedSession("b", "flashcard", 0, storage), null);
});

test("저장소가 없거나 지우기 후에는 null", () => {
  assert.equal(loadSavedSession("x", "quiz", 0, null), null);
  const storage = fakeStorage();
  saveSession("x", { snapshot: quiz }, 0, storage);
  clearSavedSession("x", storage);
  assert.equal(loadAnySavedSession("x", 0, storage), null);
});

test("경과 시간을 한국어로 표시한다", () => {
  assert.equal(formatSavedAgo(0, 30_000), "방금 전");
  assert.equal(formatSavedAgo(0, 5 * 60_000), "5분 전");
  assert.equal(formatSavedAgo(0, 3 * 3_600_000), "3시간 전");
  assert.equal(formatSavedAgo(0, 2 * 86_400_000), "2일 전");
});

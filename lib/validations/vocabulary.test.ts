import assert from "node:assert/strict";
import { test } from "node:test";

import {
  batchItemSchema,
  batchSaveSchema,
  BATCH_SAVE_MAX_ITEMS,
} from "@/lib/validations/vocabulary";

const validCreate = {
  resolution: "create",
  word: "食べる",
  reading: "たべる",
  partOfSpeech: "동사",
  jlptLevel: "N5",
  meanings: ["먹다"],
  examples: [],
};

test("create 항목은 단어장 없이 통과하고 관련 표현은 기본 빈 배열이다", () => {
  const parsed = batchItemSchema.safeParse(validCreate);
  assert.equal(parsed.success, true);
  if (parsed.success && parsed.data.resolution === "create") {
    assert.deepEqual(parsed.data.relatedExpressions, []);
  }
});

test("create 항목에 뜻이 없으면 항목 단위 오류 메시지를 낸다", () => {
  const parsed = batchItemSchema.safeParse({ ...validCreate, meanings: [] });
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.equal(parsed.error.issues[0].message, "뜻을 1개 이상 입력해주세요.");
  }
});

test("link 항목은 기존 단어 id가 필요하다", () => {
  assert.equal(
    batchItemSchema.safeParse({ resolution: "link", word: "食べる", reading: "たべる" }).success,
    false,
  );
  assert.equal(
    batchItemSchema.safeParse({
      resolution: "link",
      word: "食べる",
      reading: "たべる",
      existingVocabularyId: "v1",
    }).success,
    true,
  );
});

test("skip 항목은 단어만 있으면 된다", () => {
  assert.equal(batchItemSchema.safeParse({ resolution: "skip", word: "食べる" }).success, true);
});

test("알 수 없는 resolution은 거부한다", () => {
  assert.equal(batchItemSchema.safeParse({ ...validCreate, resolution: "merge" }).success, false);
});

test("요청 본문은 항목 내용이 잘못돼도 통과하고 개수·단어장만 검사한다", () => {
  assert.equal(
    batchSaveSchema.safeParse({ vocabularyBookIds: ["b1"], items: [{ garbage: true }] }).success,
    true,
  );
  assert.equal(batchSaveSchema.safeParse({ vocabularyBookIds: [], items: [{}] }).success, false);
  assert.equal(
    batchSaveSchema.safeParse({
      vocabularyBookIds: ["b1"],
      items: Array.from({ length: BATCH_SAVE_MAX_ITEMS + 1 }, () => ({})),
    }).success,
    false,
  );
});

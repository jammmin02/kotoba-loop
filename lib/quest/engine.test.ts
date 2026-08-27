import assert from "node:assert/strict";
import { test } from "node:test";

import { QUEST_CODES } from "@/lib/quest/constants";
import {
  applyQuestIncrement,
  formatQuestTitle,
  getQuestDateKey,
  resolveQuestTarget,
} from "@/lib/quest/engine";

test("getQuestDateKey는 KST 자정 경계를 넘으면 날짜가 바뀐다", () => {
  // 2026-08-24 23:30 KST == 2026-08-24 14:30 UTC
  assert.equal(getQuestDateKey(new Date("2026-08-24T14:30:00.000Z")), "2026-08-24");
  // 30분 뒤(2026-08-25 00:00 KST == 2026-08-24 15:00 UTC)에는 다음 날짜로 넘어간다.
  assert.equal(getQuestDateKey(new Date("2026-08-24T15:00:00.000Z")), "2026-08-25");
});

test("resolveQuestTarget은 NEW_WORD_STUDY만 daily_word_target을 따른다", () => {
  assert.equal(resolveQuestTarget(QUEST_CODES.NEW_WORD_STUDY, 10, 20), 20);
  assert.equal(resolveQuestTarget(QUEST_CODES.REVIEW_COMPLETE, 10, 20), 10);
});

test("formatQuestTitle은 {count}를 목표치로 치환한다", () => {
  assert.equal(formatQuestTitle("새 단어 {count}개 학습", 5), "새 단어 5개 학습");
});

test("applyQuestIncrement은 목표치 도달 시 딱 한 번만 justCompleted를 true로 반환한다", () => {
  const first = applyQuestIncrement({ currentCount: 9, isCompleted: false }, 10, 1);
  assert.deepEqual(first, { currentCount: 10, isCompleted: true, justCompleted: true });

  // 이미 완료된 상태에서 다시 증가시켜도 count는 그대로고 justCompleted도 false다(중복 방지).
  const second = applyQuestIncrement(first, 10, 1);
  assert.deepEqual(second, { currentCount: 10, isCompleted: true, justCompleted: false });
});

test("applyQuestIncrement은 목표치를 넘는 증가분을 잘라낸다", () => {
  const result = applyQuestIncrement({ currentCount: 0, isCompleted: false }, 1, 5);
  assert.deepEqual(result, { currentCount: 1, isCompleted: true, justCompleted: true });
});

test("applyQuestIncrement은 0 이하의 증가분에는 상태를 바꾸지 않는다", () => {
  const state = { currentCount: 3, isCompleted: false };
  assert.deepEqual(applyQuestIncrement(state, 10, 0), { ...state, justCompleted: false });
});

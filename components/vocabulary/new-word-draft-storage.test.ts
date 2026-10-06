import assert from "node:assert/strict";
import { test } from "node:test";

import { createExtraWordEntry } from "@/components/vocabulary/extra-word-card";
import {
  describeNewWordDraft,
  nextExtraKeyIndex,
  parseNewWordDraft,
  serializeNewWordDraft,
} from "@/components/vocabulary/new-word-draft-storage";
import { emptyDraft } from "@/components/vocabulary/word-draft";

const card = (key: string, word: string) => ({ ...createExtraWordEntry(key, ""), word });

test("저장한 초안을 그대로 복원한다", () => {
  const draft = {
    main: { ...emptyDraft("食べる"), reading: "たべる", meanings: ["먹다"] },
    extraWords: [card("extra-0", "飲む")],
    selectedBookIds: ["b1"],
  };
  const restored = parseNewWordDraft(serializeNewWordDraft(draft));
  assert.equal(restored?.main.reading, "たべる");
  assert.deepEqual(restored?.main.meanings, ["먹다"]);
  assert.equal(restored?.extraWords[0].word, "飲む");
  assert.deepEqual(restored?.selectedBookIds, ["b1"]);
});

test("깨진 문자열·다른 버전·빈 값은 복원하지 않는다", () => {
  assert.equal(parseNewWordDraft(null), null);
  assert.equal(parseNewWordDraft("not json"), null);
  assert.equal(parseNewWordDraft(JSON.stringify({ version: 2, main: emptyDraft("a") })), null);
});

test("내용이 비어 있는 초안은 복원할 가치가 없다", () => {
  const raw = serializeNewWordDraft({ main: emptyDraft(""), extraWords: [], selectedBookIds: [] });
  assert.equal(parseNewWordDraft(raw), null);
});

test("메인이 비어 있어도 카드가 있으면 복원한다", () => {
  const raw = serializeNewWordDraft({
    main: emptyDraft(""),
    extraWords: [card("extra-0", "飲む")],
    selectedBookIds: [],
  });
  assert.equal(parseNewWordDraft(raw)?.extraWords.length, 1);
});

test("빠진 필드는 기본값으로 채우고 모양이 틀린 필드는 거부한다", () => {
  const minimal = JSON.stringify({
    version: 1,
    main: { word: "食べる", meanings: ["먹다"], examples: [], relatedExpressions: [] },
    extraWords: [],
    selectedBookIds: ["b1", 3],
  });
  const restored = parseNewWordDraft(minimal);
  assert.deepEqual(restored?.main.aiHighlight, {
    reading: false,
    partOfSpeech: false,
    jlptLevel: false,
  });
  assert.deepEqual(restored?.selectedBookIds, ["b1"]);

  const broken = JSON.stringify({
    version: 1,
    main: { word: "食べる", meanings: "먹다" },
    extraWords: [],
    selectedBookIds: [],
  });
  assert.equal(parseNewWordDraft(broken), null);
});

test("복원된 카드의 오류는 비우고 펼침 상태는 유지한다", () => {
  const raw = serializeNewWordDraft({
    main: emptyDraft("a"),
    extraWords: [{ ...card("extra-0", "b"), error: "이전 오류", expanded: false }],
    selectedBookIds: [],
  });
  const restored = parseNewWordDraft(raw);
  assert.equal(restored?.extraWords[0].error, undefined);
  assert.equal(restored?.extraWords[0].expanded, false);
});

test("요약 문구는 단어 수에 따라 달라진다", () => {
  const base = { selectedBookIds: [] as string[] };
  assert.equal(
    describeNewWordDraft({ ...base, main: emptyDraft("食べる"), extraWords: [] }),
    "「食べる」",
  );
  assert.equal(
    describeNewWordDraft({
      ...base,
      main: emptyDraft("食べる"),
      extraWords: [card("extra-0", "飲む"), card("extra-1", "見る")],
    }),
    "「食べる」 외 2개",
  );
});

test("복원한 카드 키와 겹치지 않는 다음 번호를 구한다", () => {
  assert.equal(nextExtraKeyIndex([]), 0);
  assert.equal(nextExtraKeyIndex([card("extra-0", "a"), card("extra-4", "b")]), 5);
});

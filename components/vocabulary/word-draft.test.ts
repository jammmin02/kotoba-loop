import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyAnalysis,
  draftFromAnalysis,
  emptyDraft,
  markEdited,
  resetAiState,
  toFormValues,
  userEnteredSections,
} from "@/components/vocabulary/word-draft";
import type { WordAnalysisResult } from "@/lib/ai/word-analysis";

const result: WordAnalysisResult = {
  word: "食べる",
  reading: "たべる",
  partOfSpeech: "동사",
  jlptLevel: "N5",
  meanings: ["먹다", "섭취하다"],
  relatedKanji: ["食"],
  examples: [{ japanese: "りんごを食べる。", korean: "사과를 먹는다." }],
  synonyms: ["食う"],
  relatedExpressions: ["食べ物"],
  relatedExpressionSuggestions: [
    { relationType: "DERIVED", expression: "食べ物", meaning: "음식" },
  ],
};

test("분석으로 미리 채운 초안은 모든 값을 AI가 채운 값으로 표시한다", () => {
  const draft = draftFromAnalysis({ id: "a1", result });
  assert.equal(draft.aiAnalysisId, "a1");
  assert.deepEqual(draft.aiHighlight, { reading: true, partOfSpeech: true, jlptLevel: true });
  assert.deepEqual(draft.aiMeaningHighlight, [true, true]);
  assert.deepEqual(draft.aiRelatedHighlight, [true]);
  assert.deepEqual(draft.aiExtras?.synonyms, ["食う"]);
});

test("JLPT가 없는 분석은 JLPT 칸을 AI 표시하지 않는다", () => {
  const draft = draftFromAnalysis({ id: "a1", result: { ...result, jlptLevel: null } });
  assert.equal(draft.jlptLevel, "");
  assert.equal(draft.aiHighlight.jlptLevel, false);
});

test("섹션별 적용은 target 섹션만 바꾸고 단어는 건드리지 않는다", () => {
  const base = { ...emptyDraft("食べる"), meanings: ["직접 입력"], reading: "직접" };
  const next = applyAnalysis(base, "a1", result, "basic");
  assert.equal(next.reading, "たべる");
  assert.deepEqual(next.meanings, ["직접 입력"]);
  assert.equal(next.word, "食べる");
  assert.equal(next.aiAnalysisId, "a1");
});

test("전체 적용은 수정됨 표시를 초기화하지만 섹션별 적용은 유지한다", () => {
  const edited = { ...emptyDraft("食べる"), aiAnalysisId: "old", aiFieldsEdited: true };
  assert.equal(applyAnalysis(edited, "a1", result, "all").aiFieldsEdited, false);
  assert.equal(applyAnalysis(edited, "a1", result, "meanings").aiFieldsEdited, true);
});

test("단어를 바꾸면 AI 상태가 모두 지워진다", () => {
  const draft = resetAiState(draftFromAnalysis({ id: "a1", result }));
  assert.equal(draft.aiAnalysisId, undefined);
  assert.equal(draft.aiExtras, null);
  assert.deepEqual(draft.aiMeaningHighlight, []);
});

test("AI 분석이 있을 때만 수정됨으로 표시한다", () => {
  assert.equal(markEdited(emptyDraft("a")).aiFieldsEdited, false);
  assert.equal(markEdited(draftFromAnalysis({ id: "a1", result })).aiFieldsEdited, true);
});

test("직접 입력한 값이 없으면 덮어쓰기 확인이 필요 없다", () => {
  assert.deepEqual(userEnteredSections(emptyDraft("食べる"), "all"), []);
  assert.deepEqual(userEnteredSections(draftFromAnalysis({ id: "a1", result }), "all"), []);
});

test("직접 입력한 섹션만 덮어쓰기 대상으로 알려준다", () => {
  const draft = { ...emptyDraft("食べる"), reading: "たべる", meanings: ["먹다"] };
  assert.deepEqual(userEnteredSections(draft, "all"), ["기본 정보", "뜻"]);
  assert.deepEqual(userEnteredSections(draft, "meanings"), ["뜻"]);
  assert.deepEqual(userEnteredSections(draft, "examples"), []);
});

test("AI가 채운 값을 일부만 고치면 그 항목만 직접 입력으로 본다", () => {
  const draft = draftFromAnalysis({ id: "a1", result });
  draft.meanings = ["먹다", "직접 추가"];
  draft.aiMeaningHighlight = [true, false];
  assert.deepEqual(userEnteredSections(draft, "meanings"), ["뜻"]);
});

test("폼 값 변환은 빈 항목을 거르고 공백을 다듬는다", () => {
  const values = toFormValues(
    {
      ...emptyDraft(" 食べる "),
      meanings: [" 먹다 ", " "],
      examples: [
        { japanese: " ", korean: "" },
        { japanese: "a", korean: " b " },
      ],
      relatedExpressions: [{ relationType: "SIMILAR", expression: " ", meaning: "" }],
    },
    ["b1"],
  );
  assert.deepEqual(values.meanings, ["먹다"]);
  assert.deepEqual(values.examples, [{ japanese: "a", korean: "b" }]);
  assert.deepEqual(values.relatedExpressions, []);
  assert.equal(values.jlptLevel, null);
  assert.deepEqual(values.vocabularyBookIds, ["b1"]);
});

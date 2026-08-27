import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeAnswer } from "@/lib/quiz/normalize";

test("앞뒤 공백과 중간 공백을 모두 제거한다", () => {
  assert.equal(normalizeAnswer("  たべる ます  "), "たべるます");
});

test("전각 영숫자를 반각으로 통일한다", () => {
  assert.equal(normalizeAnswer("ＡＢＣ１２３"), "abc123");
});

test("반각 가타카나를 전각 가타카나로 통일한 뒤 히라가나로 변환한다", () => {
  assert.equal(normalizeAnswer("ﾀﾍﾞﾙ"), "たべる");
});

test("가타카나를 히라가나로 통일해 같은 값으로 취급한다", () => {
  assert.equal(normalizeAnswer("タベル"), normalizeAnswer("たべる"));
});

test("장음부호(ー)처럼 변환 대상 밖인 문자는 그대로 유지한다", () => {
  assert.equal(normalizeAnswer("コーヒー"), "こーひー");
});

test("대소문자를 구분하지 않는다", () => {
  assert.equal(normalizeAnswer("Cat"), normalizeAnswer("CAT"));
});

test("전각 공백도 일반 공백과 동일하게 제거된다", () => {
  assert.equal(normalizeAnswer("食べる　ます"), "食べるます");
});

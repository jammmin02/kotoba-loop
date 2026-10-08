import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toCsv } from "@/lib/admin/csv";

import { CsvParseError, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("쉼표와 줄바꿈으로 칸과 행을 나눈다", () => {
    assert.deepEqual(parseCsv("a,b,c\n1,2,3\n"), [
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("CRLF, CR, LF 줄바꿈을 모두 받는다", () => {
    assert.deepEqual(parseCsv("a,b\r\n1,2\r3,4\n5,6"), [
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
      ["5", "6"],
    ]);
  });

  it("맨 앞의 BOM은 버린다", () => {
    assert.deepEqual(parseCsv("﻿단어,읽기\n犬,いぬ"), [
      ["단어", "읽기"],
      ["犬", "いぬ"],
    ]);
  });

  it("따옴표 안의 쉼표, 줄바꿈, 이중 따옴표를 그대로 읽는다", () => {
    assert.deepEqual(parseCsv('a,"b,c","d\ne","f""g"\n'), [["a", "b,c", "d\ne", 'f"g']]);
  });

  it("빈 칸과 빈 따옴표 칸을 구분 없이 빈 문자열로 읽는다", () => {
    assert.deepEqual(parseCsv('a,,"",d\n'), [["a", "", "", "d"]]);
  });

  it("마지막 줄에 줄바꿈이 없어도 읽고, 끝의 빈 줄은 행으로 세지 않는다", () => {
    assert.deepEqual(parseCsv("a,b\n1,2"), [
      ["a", "b"],
      ["1", "2"],
    ]);
    assert.deepEqual(parseCsv("a,b\n\n"), [["a", "b"], [""]]);
  });

  it("빈 입력은 행이 없다", () => {
    assert.deepEqual(parseCsv(""), []);
  });

  it("따옴표가 닫히지 않으면 시작한 줄과 함께 오류를 낸다", () => {
    assert.throws(
      () => parseCsv('a,b\n1,"미완성\n3,4'),
      (error: unknown) => error instanceof CsvParseError && error.line === 2,
    );
  });

  it("toCsv로 내보낸 내용을 그대로 되읽는다(왕복)", () => {
    const rows = [
      ["食べる", "たべる", "먹다; 먹이다", "예문, 쉼표 포함", '따옴표 "인용"', "줄\n바꿈"],
      ["犬", "いぬ", "개", "", "", ""],
    ];
    const csv = toCsv(["a", "b", "c", "d", "e", "f"], rows);
    assert.deepEqual(parseCsv(csv).slice(1), rows);
  });
});

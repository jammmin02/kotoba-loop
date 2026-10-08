import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildExportCsv, buildExportJson, exportFileName } from "./export";
import { parseImportFile } from "./parse";

import type { ExportWord } from "./export";

const WORDS: ExportWord[] = [
  {
    word: "食べる",
    reading: "たべる",
    partOfSpeech: "동사",
    jlptLevel: "N5",
    meanings: ["먹다", "먹이다"],
    examples: [{ japanese: "毎日食べる。", korean: "매일, 먹는다." }],
    tags: ["동사", "기초"],
    isFavorite: true,
    bookNames: ["N5 단어", "회화"],
    progress: {
      learningStatus: "REVIEW",
      intervalStage: 3,
      nextReviewAt: "2026-10-10T09:00:00+09:00",
      lastReviewedAt: "2026-10-01T09:00:00+09:00",
      correctCount: 4,
      wrongCount: 1,
    },
  },
  {
    word: "犬",
    reading: "いぬ",
    partOfSpeech: "명사",
    jlptLevel: null,
    meanings: ["개"],
    examples: [],
    tags: [],
    isFavorite: false,
    bookNames: ["N5 단어"],
    progress: null,
  },
];

describe("CSV 내보내기", () => {
  it("BOM과 머리글을 붙이고 목록은 ; 로 구분한다", () => {
    const csv = buildExportCsv(WORDS);
    assert.ok(csv.startsWith("﻿단어,읽기,뜻,품사,JLPT,예문(일본어),예문(한국어),태그,단어장"));
    assert.ok(csv.includes("먹다; 먹이다"));
  });

  it("다시 가져오면 같은 단어 정보가 복원된다(왕복)", () => {
    const parsed = parseImportFile({ name: "export.csv", text: buildExportCsv(WORDS) });
    assert.deepEqual(parsed.fileErrors, []);
    assert.deepEqual(
      parsed.rows.map((row) => row.errors),
      [[], []],
    );
    const [first, second] = parsed.rows;
    assert.equal(first.item?.word, "食べる");
    assert.deepEqual(first.item?.meanings, ["먹다", "먹이다"]);
    assert.deepEqual(first.item?.examples, WORDS[0].examples);
    assert.deepEqual(first.item?.tags, ["동사", "기초"]);
    assert.deepEqual(first.bookNames, ["N5 단어", "회화"]);
    assert.equal(second.item?.jlptLevel, null);
  });

  it("수식으로 시작하는 값은 작은따옴표로 막고, 다시 가져오면 원래 값으로 돌아온다", () => {
    const risky: ExportWord = {
      ...WORDS[1],
      word: '=HYPERLINK("http://evil")',
      meanings: ["-5", "+1", "@SUM(A1)"],
    };
    const csv = buildExportCsv([risky]);
    assert.ok(csv.includes("'=HYPERLINK"));
    assert.ok(!/(^|,|\n)=HYPERLINK/.test(csv));

    const parsed = parseImportFile({ name: "x.csv", text: csv });
    assert.equal(parsed.rows[0].item?.word, risky.word);
    // 한 칸에 담긴 여러 뜻 중 "맨 앞이 아닌" 뜻은 칸 전체 기준으로 방어되므로 원문 그대로다
    assert.deepEqual(parsed.rows[0].item?.meanings, ["-5", "+1", "@SUM(A1)"]);
  });

  it("값 안의 세미콜론은 전각으로 바꿔 한 개의 뜻으로 유지한다", () => {
    const word: ExportWord = { ...WORDS[1], meanings: ["가다; 오다"] };
    const parsed = parseImportFile({ name: "x.csv", text: buildExportCsv([word]) });
    assert.deepEqual(parsed.rows[0].item?.meanings, ["가다； 오다"]);
  });

  it("예문은 첫 번째 한 쌍만 담는다", () => {
    const word: ExportWord = {
      ...WORDS[0],
      examples: [
        { japanese: "一つ目。", korean: "첫째." },
        { japanese: "二つ目。", korean: "둘째." },
      ],
    };
    const csv = buildExportCsv([word]);
    assert.ok(csv.includes("一つ目。"));
    assert.ok(!csv.includes("二つ目。"));
  });
});

describe("JSON 내보내기", () => {
  const books = [
    { name: "N5 단어", description: "기초", isPublic: true, color: "mint" },
    { name: "회화", description: null, isPublic: false, color: null },
  ];

  it("식별자·버전·내보낸 시각을 담는다", () => {
    const data = JSON.parse(
      buildExportJson({ words: WORDS, books, exportedAt: "2026-10-08T12:00:00+09:00" }),
    );
    assert.equal(data.format, "kotoba-loop/vocabulary");
    assert.equal(data.version, 1);
    assert.equal(data.exportedAt, "2026-10-08T12:00:00+09:00");
    assert.deepEqual(data.books[0].wordKeys, ["w1", "w2"]);
    assert.deepEqual(data.books[1].wordKeys, ["w1"]);
  });

  it("다시 가져오면 학습 기록·즐겨찾기·단어장 구성까지 복원된다(왕복)", () => {
    const text = buildExportJson({
      words: WORDS,
      books,
      exportedAt: "2026-10-08T12:00:00+09:00",
    });
    const parsed = parseImportFile({ name: "backup.json", text });
    assert.deepEqual(parsed.fileErrors, []);
    assert.deepEqual(
      parsed.rows.map((row) => row.errors),
      [[], []],
    );
    const [first, second] = parsed.rows;
    assert.equal(first.item?.isFavorite, true);
    assert.deepEqual(first.item?.progress, WORDS[0].progress);
    assert.deepEqual(first.bookNames, ["N5 단어", "회화"]);
    assert.deepEqual(second.bookNames, ["N5 단어"]);
    assert.equal(second.item?.progress, null);
    assert.deepEqual(
      parsed.books.map((book) => book.name),
      ["N5 단어", "회화"],
    );
  });

  it("단어 항목에는 단어장 이름 필드를 중복해서 넣지 않는다", () => {
    const data = JSON.parse(buildExportJson({ words: WORDS, books, exportedAt: "x" }));
    assert.equal("bookNames" in data.words[0], false);
  });
});

describe("exportFileName", () => {
  it("항상 ASCII 파일 이름이다", () => {
    const date = new Date("2026-10-08T03:00:00Z");
    assert.equal(exportFileName("all", "json", date), "kotoba-loop-words-2026-10-08.json");
    assert.equal(exportFileName("book", "csv", date), "kotoba-loop-book-2026-10-08.csv");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decodeImportBytes,
  EXPORT_FORMAT,
  EXPORT_VERSION,
  findFileDuplicates,
  parseImportFile,
  unescapeCsvCell,
  validateImportFileMeta,
} from "./parse";

const csv = (text: string) => parseImportFile({ name: "words.csv", text });
const json = (value: unknown) =>
  parseImportFile({ name: "words.json", text: JSON.stringify(value) });

describe("CSV 가져오기", () => {
  it("한국어 머리글의 기본 열을 읽는다", () => {
    const parsed = csv(
      [
        "단어,읽기,뜻,품사,JLPT,예문(일본어),예문(한국어),태그,단어장",
        "食べる,たべる,먹다; 먹이다,동사,N5,毎日食べる。,매일 먹는다.,동사; 기초,N5 단어",
      ].join("\n"),
    );
    assert.deepEqual(parsed.fileErrors, []);
    assert.equal(parsed.rows.length, 1);
    const row = parsed.rows[0];
    assert.deepEqual(row.errors, []);
    assert.equal(row.rowNumber, 2);
    assert.deepEqual(row.item?.meanings, ["먹다", "먹이다"]);
    assert.equal(row.item?.jlptLevel, "N5");
    assert.deepEqual(row.item?.examples, [{ japanese: "毎日食べる。", korean: "매일 먹는다." }]);
    assert.deepEqual(row.item?.tags, ["동사", "기초"]);
    assert.deepEqual(row.bookNames, ["N5 단어"]);
  });

  it("영어 머리글과 대소문자·공백 차이도 받는다", () => {
    const parsed = csv("Word, Reading ,Meaning\n犬,いぬ,개");
    assert.deepEqual(parsed.fileErrors, []);
    assert.equal(parsed.rows[0].item?.word, "犬");
    assert.equal(parsed.rows[0].item?.partOfSpeech, "기타");
  });

  it("필수 열이 없으면 파일 전체를 거절하고 빠진 열을 알려준다", () => {
    const parsed = csv("단어,뜻\n犬,개");
    assert.equal(parsed.rows.length, 0);
    assert.match(parsed.fileErrors[0], /읽기/);
  });

  it("JLPT 표기는 N5/n5/5를 모두 받고, 잘못된 값은 그 행의 오류로 둔다", () => {
    const parsed = csv("단어,읽기,뜻,JLPT\nA,a,x,n3\nB,b,y,4\nC,c,z,N9");
    assert.equal(parsed.rows[0].item?.jlptLevel, "N3");
    assert.equal(parsed.rows[1].item?.jlptLevel, "N4");
    assert.equal(parsed.rows[2].item, null);
    assert.match(parsed.rows[2].errors[0], /JLPT/);
  });

  it("행마다 오류를 따로 모으고, 올바른 행은 그대로 둔다", () => {
    const parsed = csv("단어,읽기,뜻\n犬,いぬ,개\n,ねこ,고양이\n鳥,とり,");
    assert.ok(parsed.rows[0].item);
    assert.equal(parsed.rows[1].item, null);
    assert.ok(parsed.rows[1].errors.includes("단어가 비어 있어요."));
    assert.equal(parsed.rows[2].item, null);
    assert.ok(parsed.rows[2].errors.includes("뜻이 비어 있어요."));
  });

  it("빈 행은 건너뛰되 행 번호는 원래 위치를 유지한다", () => {
    const parsed = csv("단어,읽기,뜻\n犬,いぬ,개\n,,\n鳥,とり,새");
    assert.deepEqual(
      parsed.rows.map((row) => row.rowNumber),
      [2, 4],
    );
  });

  it("예문은 일본어와 해석이 함께 있어야 한다", () => {
    const parsed = csv("단어,읽기,뜻,예문(일본어)\n犬,いぬ,개,犬がいる。");
    assert.equal(parsed.rows[0].item, null);
    assert.ok(parsed.rows[0].errors.includes("예문 해석이 비어 있어요."));
  });

  it("내보낼 때 붙인 수식 방어 작은따옴표를 되돌린다", () => {
    assert.equal(unescapeCsvCell("'=1+1"), "=1+1");
    assert.equal(unescapeCsvCell("'-뜻"), "-뜻");
    assert.equal(unescapeCsvCell("'안녕"), "'안녕");
    assert.equal(unescapeCsvCell("평범"), "평범");
  });

  it("가져온 값은 수식으로 해석되지 않는 텍스트로만 다룬다(그대로 저장될 뿐 실행되지 않는다)", () => {
    const parsed = csv("단어,읽기,뜻\n=cmd|' /C calc'!A0,x,'=1+1");
    assert.equal(parsed.rows[0].item?.word, "=cmd|' /C calc'!A0");
    assert.deepEqual(parsed.rows[0].item?.meanings, ["=1+1"]);
  });

  it("따옴표가 닫히지 않은 파일은 줄 번호와 함께 거절한다", () => {
    const parsed = csv('단어,읽기,뜻\n犬,いぬ,"개');
    assert.match(parsed.fileErrors[0], /2번째 줄/);
  });

  it("가져올 단어가 없거나 너무 많으면 거절한다", () => {
    assert.match(csv("단어,읽기,뜻\n").fileErrors[0], /가져올 단어가 없어요/);
    const many = ["단어,읽기,뜻", ...Array.from({ length: 5001 }, (_, i) => `w${i},r${i},m${i}`)];
    assert.match(csv(many.join("\n")).fileErrors[0], /너무 많아요/);
  });

  it("길이 제한을 넘는 값을 행 오류로 알려준다", () => {
    const parsed = csv(`단어,읽기,뜻\n${"가".repeat(51)},a,b`);
    assert.ok(parsed.rows[0].errors.some((message) => message.includes("50자 이하")));
  });
});

describe("JSON 가져오기", () => {
  const base = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    books: [{ name: "N5", description: "기초", isPublic: true, color: "mint", wordKeys: ["a"] }],
    words: [
      {
        key: "a",
        word: "犬",
        reading: "いぬ",
        partOfSpeech: "명사",
        jlptLevel: "N5",
        meanings: ["개"],
        examples: [{ japanese: "犬がいる。", korean: "개가 있다." }],
        tags: ["동물"],
        isFavorite: true,
        progress: {
          learningStatus: "REVIEW",
          intervalStage: 3,
          nextReviewAt: "2026-10-10T09:00:00+09:00",
          lastReviewedAt: "2026-10-01T09:00:00+09:00",
          correctCount: 4,
          wrongCount: 1,
        },
      },
    ],
  };

  it("단어, 즐겨찾기, 학습 기록, 단어장 구성을 읽는다", () => {
    const parsed = json(base);
    assert.deepEqual(parsed.fileErrors, []);
    const row = parsed.rows[0];
    assert.deepEqual(row.errors, []);
    assert.equal(row.item?.isFavorite, true);
    assert.equal(row.item?.progress?.learningStatus, "REVIEW");
    assert.deepEqual(row.bookNames, ["N5"]);
    assert.equal(parsed.books[0].name, "N5");
    // 공개 여부는 가져올 때 항상 비공개로 시작한다
    assert.equal(parsed.books[0].isPublic, false);
    assert.equal(parsed.books[0].color, "mint");
  });

  it("식별자가 다르거나 JSON이 깨졌으면 거절한다", () => {
    assert.match(
      json({ format: "other", version: 1, words: [] }).fileErrors[0],
      /내보낸 단어 파일이 아니에요/,
    );
    assert.match(parseImportFile({ name: "x.json", text: "{깨짐" }).fileErrors[0], /JSON 형식/);
  });

  it("더 새로운 버전은 업데이트를 안내하며 거절한다", () => {
    const parsed = json({ ...base, version: EXPORT_VERSION + 1 });
    assert.match(parsed.fileErrors[0], /더 새로운 버전/);
    assert.equal(parsed.rows.length, 0);
  });

  it("알 수 없는 추가 필드는 무시한다", () => {
    const parsed = json({
      ...base,
      futureField: { a: 1 },
      words: [{ ...base.words[0], somethingNew: true }],
    });
    assert.deepEqual(parsed.fileErrors, []);
    assert.ok(parsed.rows[0].item);
  });

  it("잘못된 학습 기록이나 단어는 그 행의 오류로 두고 나머지는 살린다", () => {
    const parsed = json({
      ...base,
      words: [
        base.words[0],
        { ...base.words[0], key: "b", progress: { learningStatus: "BOGUS" } },
        { key: "c", word: "", reading: "", meanings: [] },
      ],
    });
    assert.ok(parsed.rows[0].item);
    assert.ok(parsed.rows[1].errors.includes("학습 기록 형식이 올바르지 않아요."));
    assert.equal(parsed.rows[2].item, null);
    assert.ok(parsed.rows[2].errors.includes("단어가 비어 있어요."));
  });

  it("품사가 비어 있으면 기본값을 쓴다", () => {
    const parsed = json({ ...base, words: [{ ...base.words[0], partOfSpeech: "" }] });
    assert.equal(parsed.rows[0].item?.partOfSpeech, "기타");
  });

  it("이름이 없는 단어장 정보는 경고와 함께 무시한다", () => {
    const parsed = json({ ...base, books: [{ name: "", wordKeys: ["a"] }] });
    assert.equal(parsed.books.length, 0);
    assert.ok(parsed.warnings.length > 0);
  });
});

describe("파일 읽기 보조", () => {
  it("UTF-8은 그대로, UTF-8이 아니면 EUC-KR로 읽는다", () => {
    assert.deepEqual(decodeImportBytes(new TextEncoder().encode("단어")), {
      text: "단어",
      encoding: "utf-8",
    });
    // "단어"를 CP949로 저장한 바이트
    assert.deepEqual(decodeImportBytes(new Uint8Array([0xb4, 0xdc, 0xbe, 0xee])), {
      text: "단어",
      encoding: "euc-kr",
    });
  });

  it("확장자와 크기를 먼저 검사한다", () => {
    assert.equal(validateImportFileMeta({ name: "a.csv", size: 10 }), null);
    assert.equal(validateImportFileMeta({ name: "a.JSON", size: 10 }), null);
    assert.match(validateImportFileMeta({ name: "a.xlsx", size: 10 }) ?? "", /CSV 또는 JSON/);
    assert.match(validateImportFileMeta({ name: "a.csv", size: 0 }) ?? "", /빈 파일/);
    assert.match(validateImportFileMeta({ name: "a.csv", size: 6 * 1024 * 1024 }) ?? "", /5MB/);
  });

  it("파일 안의 중복(단어+읽기)은 첫 행만 남기고 나머지를 알려준다", () => {
    const parsed = csv("단어,읽기,뜻\n犬,いぬ,개\n猫,ねこ,고양이\n犬,いぬ,멍멍이\n犬,いぬ,dog");
    const duplicates = findFileDuplicates(parsed.rows);
    assert.deepEqual(
      [...duplicates.entries()],
      [
        [4, 2],
        [5, 2],
      ],
    );
  });
});

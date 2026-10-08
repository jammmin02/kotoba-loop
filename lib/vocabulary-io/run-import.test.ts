import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { neededBookNames, runImport, toImportableRows } from "./run-import";

import type { ImportApi, ImportableRow } from "./run-import";
import type { ImportChunkInput, ImportItemStatus, ImportWord } from "./schema";

function word(name: string): ImportWord {
  return {
    word: name,
    reading: name,
    partOfSpeech: "명사",
    jlptLevel: null,
    meanings: ["뜻"],
    examples: [],
    tags: [],
    isFavorite: false,
    progress: null,
  };
}

const PREVIEW = { word: "", reading: "", meanings: "" };

function rows(count: number, bookNames: string[] = []): ImportableRow[] {
  return Array.from({ length: count }, (_, i) => ({
    rowNumber: i + 2,
    item: word(`w${i}`),
    bookNames,
  }));
}

interface FakeApiOptions {
  existingBooks?: { id: string; name: string }[];
  failChunks?: number[];
  statusFor?: (index: number) => ImportItemStatus;
}

function fakeApi(options: FakeApiOptions = {}) {
  const books = [...(options.existingBooks ?? [])];
  const created: string[] = [];
  const chunks: (ImportChunkInput & { items: unknown[] })[] = [];

  const api: ImportApi = {
    async listBooks() {
      return [...books];
    },
    async createBook({ name }) {
      const book = { id: `new-${name}`, name };
      created.push(name);
      books.push(book);
      return book;
    },
    async importChunk(body) {
      const chunkIndex = chunks.length;
      chunks.push(body);
      if (options.failChunks?.includes(chunkIndex))
        throw new Error("네트워크 연결에 실패했습니다.");
      return {
        results: body.items.map((_, i) => ({ status: options.statusFor?.(i) ?? "created" })),
        counts: {
          created: body.items.length,
          overwritten: 0,
          "kept-both": 0,
          skipped: 0,
          failed: 0,
        },
        unlockedAchievements: chunkIndex === 0 ? [{ title: "첫 단어 등록" }] : [],
      };
    },
  };
  return { api, created, chunks };
}

const BASE = { fileBooks: [], duplicatePolicy: "skip" as const, includeProgress: false };

describe("neededBookNames", () => {
  it("한 단어장 모드: 새 단어장만 만들고 기존 단어장은 만들 필요가 없다", () => {
    assert.deepEqual(
      neededBookNames(rows(2), { mode: "single", target: { kind: "new", name: "새 책" } }),
      ["새 책"],
    );
    assert.deepEqual(
      neededBookNames(rows(2), { mode: "single", target: { kind: "existing", id: "b1" } }),
      [],
    );
  });

  it("복원 모드: 파일에 적힌 이름을 중복 없이 모으고, 이름이 없는 단어는 대체 단어장을 쓴다", () => {
    const mixed = [...rows(1, ["A", "B"]), ...rows(1, ["A"]), ...rows(1, [])];
    assert.deepEqual(neededBookNames(mixed, { mode: "restore", fallbackName: "가져온 단어" }), [
      "A",
      "B",
      "가져온 단어",
    ]);
  });

  it("단어장 이름은 서버 규칙 길이로 자른다", () => {
    const names = neededBookNames(rows(1, ["가".repeat(80)]), {
      mode: "restore",
      fallbackName: "x",
    });
    assert.equal(names[0].length, 50);
  });
});

describe("toImportableRows", () => {
  it("오류 행과 건너뛸 행을 뺀다", () => {
    const parsed = [
      { rowNumber: 2, preview: PREVIEW, item: word("a"), bookNames: [], errors: [] },
      { rowNumber: 3, preview: PREVIEW, item: null, bookNames: [], errors: ["오류"] },
      { rowNumber: 4, preview: PREVIEW, item: word("b"), bookNames: [], errors: [] },
    ];
    assert.deepEqual(
      toImportableRows(parsed, new Set([4])).map((row) => row.rowNumber),
      [2],
    );
  });
});

describe("runImport", () => {
  it("50개씩 나눠 보내고 진행 상황을 알린다", async () => {
    const { api, chunks } = fakeApi();
    const progress: number[] = [];
    const outcome = await runImport({
      ...BASE,
      rows: rows(120),
      plan: { mode: "single", target: { kind: "existing", id: "b1" } },
      api,
      onProgress: ({ processed }) => progress.push(processed),
    });
    assert.deepEqual(
      chunks.map((chunk) => chunk.items.length),
      [50, 50, 20],
    );
    assert.deepEqual(progress, [0, 50, 100, 120]);
    assert.equal(outcome.results.size, 120);
    assert.equal(outcome.stopped, false);
    assert.deepEqual(outcome.unlockedAchievementTitles, ["첫 단어 등록"]);
  });

  it("옵션과 단어장 id가 서버 요청에 그대로 실린다", async () => {
    const { api, chunks } = fakeApi();
    await runImport({
      ...BASE,
      duplicatePolicy: "overwrite",
      includeProgress: true,
      rows: rows(1),
      plan: { mode: "single", target: { kind: "existing", id: "b1" } },
      api,
    });
    assert.equal(chunks[0].duplicatePolicy, "overwrite");
    assert.equal(chunks[0].includeProgress, true);
    assert.deepEqual((chunks[0].items[0] as { bookIds: string[] }).bookIds, ["b1"]);
  });

  it("같은 이름의 단어장이 있으면 재사용하고, 없으면 만든다", async () => {
    const { api, created, chunks } = fakeApi({ existingBooks: [{ id: "b-A", name: "A" }] });
    await runImport({
      ...BASE,
      rows: [...rows(1, ["A"]), ...rows(1, ["B"])].map((row, i) => ({ ...row, rowNumber: i + 2 })),
      plan: { mode: "restore", fallbackName: "가져온 단어" },
      fileBooks: [{ name: "B", description: "설명", isPublic: false, color: "mint" }],
      api,
    });
    assert.deepEqual(created, ["B"]);
    const bookIds = chunks[0].items.map((item) => (item as { bookIds: string[] }).bookIds);
    assert.deepEqual(bookIds, [["b-A"], ["new-B"]]);
  });

  it("복원 모드에서 단어장이 적히지 않은 단어는 대체 단어장으로 간다", async () => {
    const { api, created, chunks } = fakeApi();
    await runImport({
      ...BASE,
      rows: rows(1, []),
      plan: { mode: "restore", fallbackName: "가져온 단어" },
      api,
    });
    assert.deepEqual(created, ["가져온 단어"]);
    assert.deepEqual((chunks[0].items[0] as { bookIds: string[] }).bookIds, ["new-가져온 단어"]);
  });

  it("한 묶음이 실패해도 나머지는 계속하고, 실패한 행에 사유를 남긴다", async () => {
    const { api } = fakeApi({ failChunks: [1] });
    const outcome = await runImport({
      ...BASE,
      rows: rows(120),
      plan: { mode: "single", target: { kind: "existing", id: "b1" } },
      api,
    });
    const statuses = [...outcome.results.values()].map((result) => result.status);
    assert.equal(statuses.filter((status) => status === "failed").length, 50);
    assert.equal(statuses.filter((status) => status === "created").length, 70);
    assert.equal(outcome.results.get(60)?.reason, "네트워크 연결에 실패했습니다.");
  });

  it("중단하면 처리 중인 묶음까지만 끝내고 나머지는 처리하지 못한 행으로 남긴다", async () => {
    const { api, chunks } = fakeApi();
    let calls = 0;
    const outcome = await runImport({
      ...BASE,
      rows: rows(120),
      plan: { mode: "single", target: { kind: "existing", id: "b1" } },
      api,
      shouldStop: () => calls++ >= 1,
    });
    assert.equal(chunks.length, 1);
    assert.equal(outcome.stopped, true);
    assert.equal(outcome.results.size, 50);
    assert.equal(outcome.unprocessed.length, 70);
  });

  it("서버가 건너뜀/덮어씀으로 답하면 그대로 기록한다", async () => {
    const { api } = fakeApi({ statusFor: (i) => (i === 0 ? "skipped" : "overwritten") });
    const outcome = await runImport({
      ...BASE,
      rows: rows(3),
      plan: { mode: "single", target: { kind: "existing", id: "b1" } },
      api,
    });
    assert.deepEqual(
      [...outcome.results.values()].map((result) => result.status),
      ["skipped", "overwritten", "overwritten"],
    );
  });
});

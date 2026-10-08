import { VOCABULARY_BOOK_NAME_MAX } from "@/lib/validations/vocabulary-book";
import type { BookColor } from "@/lib/vocabulary-book-color";

import { IMPORT_CHUNK_SIZE } from "./schema";

import type { ParsedBook, ParsedRow } from "./parse";
import type {
  DuplicatePolicy,
  ImportChunkInput,
  ImportChunkResult,
  ImportItemResult,
  ImportWord,
} from "./schema";

/** 가져오기 화면이 서버와 주고받는 세 가지 요청. 테스트에서는 가짜로 바꿔 끼운다. */
export interface ImportApi {
  listBooks(): Promise<{ id: string; name: string }[]>;
  createBook(input: {
    name: string;
    description: string | null;
    color: BookColor | null;
  }): Promise<{ id: string; name: string }>;
  importChunk(body: ImportChunkInput & { items: unknown[] }): Promise<
    ImportChunkResult & {
      unlockedAchievements: { title: string }[];
    }
  >;
}

/** 단어를 어느 단어장에 넣을지. */
export type BookPlan =
  /** 모든 단어를 한 단어장에 넣는다(기존 단어장 또는 새로 만들 단어장). */
  | { mode: "single"; target: { kind: "existing"; id: string } | { kind: "new"; name: string } }
  /** 파일에 적힌 단어장 이름대로 나눠 넣는다. 단어장이 적히지 않은 단어는 `fallbackName` 단어장에 넣는다. */
  | { mode: "restore"; fallbackName: string };

export interface ImportableRow {
  rowNumber: number;
  item: ImportWord;
  bookNames: string[];
}

export function toImportableRows(rows: ParsedRow[], skipRowNumbers: Set<number>): ImportableRow[] {
  return rows.flatMap((row) =>
    row.item && !skipRowNumbers.has(row.rowNumber)
      ? [{ rowNumber: row.rowNumber, item: row.item, bookNames: row.bookNames }]
      : [],
  );
}

/** 단어장 이름은 서버 규칙(최대 길이)에 맞춰 자른다. */
function cleanBookName(name: string): string {
  return name.trim().slice(0, VOCABULARY_BOOK_NAME_MAX);
}

/** 이 가져오기에서 필요한 단어장 이름(중복 없이, 처음 나온 순서). */
export function neededBookNames(rows: ImportableRow[], plan: BookPlan): string[] {
  const names: string[] = [];
  const add = (name: string) => {
    const cleaned = cleanBookName(name);
    if (cleaned && !names.includes(cleaned)) names.push(cleaned);
  };

  if (plan.mode === "single") {
    if (plan.target.kind === "new") add(plan.target.name);
    return names;
  }
  for (const row of rows) {
    if (row.bookNames.length === 0) add(plan.fallbackName);
    for (const name of row.bookNames) add(name);
  }
  return names;
}

export interface ImportProgressUpdate {
  processed: number;
  total: number;
}

export interface RunImportOptions {
  rows: ImportableRow[];
  plan: BookPlan;
  /** 파일에 적힌 단어장 정의(설명·색). 새로 만들 때만 쓴다. */
  fileBooks: ParsedBook[];
  duplicatePolicy: DuplicatePolicy;
  includeProgress: boolean;
  api: ImportApi;
  onProgress?: (update: ImportProgressUpdate) => void;
  /** true를 돌려주면 지금 처리 중인 묶음까지만 끝내고 멈춘다. */
  shouldStop?: () => boolean;
}

export interface RunImportOutcome {
  /** 행 번호 → 결과. 처리하지 못한 행(중단)은 들어 있지 않다. */
  results: Map<number, ImportItemResult>;
  /** 중단돼서 처리하지 못한 행 번호. */
  unprocessed: number[];
  stopped: boolean;
  unlockedAchievementTitles: string[];
  /** 새로 만들었거나 재사용한 단어장 이름 → id. */
  bookIdsByName: Map<string, string>;
}

/**
 * 가져오기를 끝까지 수행한다: ① 필요한 단어장을 확정(같은 이름이 있으면 재사용, 없으면 생성) ② 단어를
 * `IMPORT_CHUNK_SIZE`개씩 서버에 보내며 진행 상황 보고 ③ 한 묶음이 실패해도 나머지는 계속한다.
 * 실패한 묶음의 행은 사유와 함께 "failed"로 기록돼 화면이 다시 시도할 수 있다.
 */
export async function runImport(options: RunImportOptions): Promise<RunImportOutcome> {
  const { rows, plan, fileBooks, duplicatePolicy, includeProgress, api } = options;
  const results = new Map<number, ImportItemResult>();
  const bookIdsByName = new Map<string, string>();
  const unlockedAchievementTitles: string[] = [];

  // ① 단어장 확정
  const wanted = neededBookNames(rows, plan);
  if (wanted.length > 0) {
    const existing = await api.listBooks();
    for (const name of wanted) {
      const found = existing.find((book) => book.name === name);
      if (found) {
        bookIdsByName.set(name, found.id);
        continue;
      }
      const definition = fileBooks.find((book) => cleanBookName(book.name) === name);
      const created = await api.createBook({
        name,
        description: definition?.description ?? null,
        color: definition?.color ?? null,
      });
      bookIdsByName.set(name, created.id);
      existing.push(created);
    }
  }

  const bookIdsFor = (row: ImportableRow): string[] => {
    if (plan.mode === "single") {
      return plan.target.kind === "existing"
        ? [plan.target.id]
        : [bookIdsByName.get(cleanBookName(plan.target.name)) as string];
    }
    const names = row.bookNames.length > 0 ? row.bookNames : [plan.fallbackName];
    return [...new Set(names.map(cleanBookName).filter(Boolean))].map(
      (name) => bookIdsByName.get(name) as string,
    );
  };

  // ② 묶음 전송
  let stopped = false;
  let processed = 0;
  options.onProgress?.({ processed, total: rows.length });

  for (let start = 0; start < rows.length; start += IMPORT_CHUNK_SIZE) {
    if (options.shouldStop?.()) {
      stopped = true;
      break;
    }
    const chunk = rows.slice(start, start + IMPORT_CHUNK_SIZE);
    try {
      const response = await api.importChunk({
        duplicatePolicy,
        includeProgress,
        items: chunk.map((row) => ({ ...row.item, bookIds: bookIdsFor(row) })),
      });
      chunk.forEach((row, index) => {
        results.set(
          row.rowNumber,
          response.results[index] ?? { status: "failed", reason: "응답이 비어 있어요." },
        );
      });
      unlockedAchievementTitles.push(...response.unlockedAchievements.map((a) => a.title));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "저장하지 못했어요.";
      for (const row of chunk) results.set(row.rowNumber, { status: "failed", reason });
    }
    processed += chunk.length;
    options.onProgress?.({ processed, total: rows.length });
  }

  return {
    results,
    unprocessed: rows.filter((row) => !results.has(row.rowNumber)).map((row) => row.rowNumber),
    stopped,
    unlockedAchievementTitles,
    bookIdsByName,
  };
}

import {
  VOCABULARY_BOOK_DESCRIPTION_MAX,
  VOCABULARY_BOOK_NAME_MAX,
} from "@/lib/validations/vocabulary-book";
import { toBookColor } from "@/lib/vocabulary-book-color";
import type { BookColor } from "@/lib/vocabulary-book-color";

import { CsvParseError, parseCsv } from "./csv";
import {
  DEFAULT_PART_OF_SPEECH,
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_ROWS,
  importProgressSchema,
  importWordSchema,
} from "./schema";

import type { ImportWord } from "./schema";

/** 내보내기 JSON의 식별자/버전. 읽는 쪽은 같은 주 버전(1)만 받는다. */
export const EXPORT_FORMAT = "kotoba-loop/vocabulary";
export const EXPORT_VERSION = 1;

/** 오류 행에서도 어떤 행인지 알아볼 수 있도록, 검증 전의 원본 값 일부를 그대로 보관한다. */
export interface RowPreview {
  word: string;
  reading: string;
  meanings: string;
}

export interface ParsedRow {
  /** 스프레드시트 기준 행 번호(CSV는 머리글이 1행) / JSON은 words 배열의 순번(1부터). */
  rowNumber: number;
  preview: RowPreview;
  /** 검증을 통과한 단어. 오류가 있으면 null. */
  item: ImportWord | null;
  /** 이 단어가 속한 단어장 이름(파일에 적혀 있을 때만). */
  bookNames: string[];
  errors: string[];
}

export interface ParsedBook {
  name: string;
  description: string | null;
  isPublic: boolean;
  color: BookColor | null;
}

export interface ParsedFile {
  format: "csv" | "json";
  rows: ParsedRow[];
  /** JSON에 담긴 단어장 정의(CSV는 항상 빈 배열). */
  books: ParsedBook[];
  /** 파일 전체를 못 쓰게 하는 문제. 하나라도 있으면 가져올 수 없다. */
  fileErrors: string[];
  /** 일부 정보를 무시했지만 가져오기는 계속할 수 있는 경고. */
  warnings: string[];
}

// ---------------------------------------------------------------- 파일 읽기

/**
 * 파일 바이트를 글자로 바꾼다. UTF-8을 먼저 엄격하게 시도하고, 깨지면 EUC-KR(CP949)로 다시 읽는다 —
 * 한국어 엑셀이 CSV를 CP949로 저장하는 경우가 흔하다.
 */
export function decodeImportBytes(bytes: Uint8Array): {
  text: string;
  encoding: "utf-8" | "euc-kr";
} {
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("euc-kr").decode(bytes), encoding: "euc-kr" };
  }
}

/** 읽기 전에 파일 이름/크기만으로 거를 수 있는 문제. */
export function validateImportFileMeta(file: { name: string; size: number }): string | null {
  if (!/\.(csv|json)$/i.test(file.name)) return "CSV 또는 JSON 파일만 가져올 수 있어요.";
  if (file.size === 0) return "빈 파일이에요.";
  if (file.size > IMPORT_MAX_FILE_BYTES) {
    return `파일이 너무 커요. ${IMPORT_MAX_FILE_BYTES / 1024 / 1024}MB 이하로 나눠서 가져와 주세요.`;
  }
  return null;
}

function detectFormat(fileName: string, text: string): "csv" | "json" {
  if (/\.json$/i.test(fileName)) return "json";
  if (/\.csv$/i.test(fileName)) return "csv";
  return text.trimStart().startsWith("{") ? "json" : "csv";
}

export function parseImportFile(file: { name: string; text: string }): ParsedFile {
  return detectFormat(file.name, file.text) === "json"
    ? parseJsonFile(file.text)
    : parseCsvFile(file.text);
}

function emptyResult(format: "csv" | "json", fileErrors: string[] = []): ParsedFile {
  return { format, rows: [], books: [], fileErrors, warnings: [] };
}

function zodMessages(error: { issues: { message: string }[] }): string[] {
  return [...new Set(error.issues.map((issue) => issue.message))];
}

// ---------------------------------------------------------------- CSV

type ColumnKey =
  | "word"
  | "reading"
  | "meanings"
  | "partOfSpeech"
  | "jlpt"
  | "exampleJa"
  | "exampleKo"
  | "tags"
  | "books";

/** 머리글 이름 별칭(공백·괄호·대소문자를 뺀 형태). 한국어/영어 머리글을 모두 받는다. */
const COLUMN_ALIASES: Record<ColumnKey, string[]> = {
  word: ["단어", "word", "expression"],
  reading: ["읽기", "후리가나", "reading", "furigana", "yomi"],
  meanings: ["뜻", "의미", "meaning", "meanings"],
  partOfSpeech: ["품사", "partofspeech", "pos"],
  jlpt: ["jlpt", "jlpt급수", "급수", "level"],
  exampleJa: ["예문일본어", "예문", "examplejapanese", "exampleja", "examplejp"],
  exampleKo: ["예문한국어", "예문해석", "examplekorean", "exampleko"],
  tags: ["태그", "tag", "tags"],
  books: ["단어장", "book", "books", "vocabularybook"],
};

const REQUIRED_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "word", label: "단어" },
  { key: "reading", label: "읽기" },
  { key: "meanings", label: "뜻" },
];

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s_\-()（）]/g, "");
}

/**
 * 내보낼 때 수식 주입 방어로 붙인 맨 앞 작은따옴표를 되돌린다(`'=1+1` → `=1+1`). 사용자가 직접 쓴
 * 따옴표(`'안녕`)는 건드리지 않도록, 뒤따르는 글자가 수식 시작 문자일 때만 뺀다.
 */
export function unescapeCsvCell(cell: string): string {
  return /^'[=+\-@\t\r]/.test(cell) ? cell.slice(1) : cell;
}

/** `;`(반각)로 나누고 빈 값은 버린다. 내보낼 때 값 안의 `;`는 `；`로 바꿔 쓰므로 왕복해도 섞이지 않는다. */
function splitList(value: string): string[] {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseJlptCell(value: string): { level: string | null; error?: string } {
  const text = value.trim();
  if (!text) return { level: null };
  const match = text.match(/^n?([1-5])$/i);
  if (!match) {
    return { level: null, error: `JLPT 값이 올바르지 않아요("${text}"). N1~N5 중 하나여야 해요.` };
  }
  return { level: `N${match[1]}` };
}

function parseCsvFile(text: string): ParsedFile {
  let table: string[][];
  try {
    table = parseCsv(text);
  } catch (error) {
    if (error instanceof CsvParseError) {
      return emptyResult("csv", [`${error.line}번째 줄 근처: ${error.message}`]);
    }
    throw error;
  }

  if (table.length === 0) return emptyResult("csv", ["내용이 없어요."]);

  const header = table[0].map(normalizeHeader);
  const columnIndex = {} as Partial<Record<ColumnKey, number>>;
  for (const key of Object.keys(COLUMN_ALIASES) as ColumnKey[]) {
    const index = header.findIndex((name) => COLUMN_ALIASES[key].includes(name));
    if (index !== -1) columnIndex[key] = index;
  }

  const missing = REQUIRED_COLUMNS.filter(({ key }) => columnIndex[key] === undefined);
  if (missing.length > 0) {
    return emptyResult("csv", [
      `필수 열이 없어요: ${missing.map(({ label }) => label).join(", ")}. 첫 줄은 "단어, 읽기, 뜻, ..." 같은 머리글이어야 해요.`,
    ]);
  }

  const dataRows = table.slice(1).filter((row) => row.some((cell) => cell.trim() !== ""));
  if (dataRows.length === 0) return emptyResult("csv", ["가져올 단어가 없어요."]);
  if (dataRows.length > IMPORT_MAX_ROWS) {
    return emptyResult("csv", [
      `단어가 너무 많아요(${dataRows.length}개). 한 번에 ${IMPORT_MAX_ROWS.toLocaleString()}개까지 가져올 수 있어요.`,
    ]);
  }

  const cell = (row: string[], key: ColumnKey) => {
    const index = columnIndex[key];
    return index === undefined ? "" : unescapeCsvCell(row[index] ?? "").trim();
  };

  // 빈 행을 걸러내면 행 번호가 틀어지므로, 원래 표에서의 위치로 번호를 매긴다.
  const rows: ParsedRow[] = [];
  table.slice(1).forEach((row, index) => {
    if (!row.some((value) => value.trim() !== "")) return;

    const jlpt = parseJlptCell(cell(row, "jlpt"));
    const exampleJa = cell(row, "exampleJa");
    const exampleKo = cell(row, "exampleKo");
    const result = importWordSchema.safeParse({
      word: cell(row, "word"),
      reading: cell(row, "reading"),
      partOfSpeech: cell(row, "partOfSpeech") || DEFAULT_PART_OF_SPEECH,
      jlptLevel: jlpt.level,
      meanings: splitList(cell(row, "meanings")),
      examples: exampleJa || exampleKo ? [{ japanese: exampleJa, korean: exampleKo }] : [],
      tags: splitList(cell(row, "tags")),
      isFavorite: false,
      progress: null,
    });

    const errors = [
      ...(jlpt.error ? [jlpt.error] : []),
      ...(result.success ? [] : zodMessages(result.error)),
    ];
    rows.push({
      rowNumber: index + 2,
      preview: {
        word: cell(row, "word"),
        reading: cell(row, "reading"),
        meanings: splitList(cell(row, "meanings")).join(", "),
      },
      item: errors.length === 0 && result.success ? result.data : null,
      bookNames: splitList(cell(row, "books")),
      errors,
    });
  });

  return { format: "csv", rows, books: [], fileErrors: [], warnings: [] };
}

// ---------------------------------------------------------------- JSON

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseJsonBooks(value: unknown, warnings: string[]) {
  const books: ParsedBook[] = [];
  const keyToBookNames = new Map<string, string[]>();
  if (value === undefined) return { books, keyToBookNames };
  if (!Array.isArray(value)) {
    warnings.push("단어장 정보 형식이 올바르지 않아 단어장 구성은 무시했어요.");
    return { books, keyToBookNames };
  }

  for (const entry of value) {
    const name = isRecord(entry) ? asString(entry.name).trim() : "";
    if (!isRecord(entry) || !name || name.length > VOCABULARY_BOOK_NAME_MAX) {
      warnings.push("이름이 없거나 너무 긴 단어장 정보는 무시했어요.");
      continue;
    }
    const description = asString(entry.description).trim();
    books.push({
      name,
      description: description ? description.slice(0, VOCABULARY_BOOK_DESCRIPTION_MAX) : null,
      isPublic: false, // 가져온 단어장은 항상 비공개로 시작한다(공개 여부는 직접 정한다).
      color: toBookColor(asString(entry.color)),
    });
    for (const key of Array.isArray(entry.wordKeys) ? entry.wordKeys : []) {
      if (typeof key !== "string") continue;
      keyToBookNames.set(key, [...(keyToBookNames.get(key) ?? []), name]);
    }
  }
  return { books, keyToBookNames };
}

function parseJsonFile(text: string): ParsedFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return emptyResult("json", ["JSON 형식이 올바르지 않아요."]);
  }

  if (!isRecord(data) || data.format !== EXPORT_FORMAT) {
    return emptyResult("json", ["kotoba-loop에서 내보낸 단어 파일이 아니에요."]);
  }
  if (typeof data.version !== "number" || !Number.isInteger(data.version) || data.version < 1) {
    return emptyResult("json", ["파일 버전을 알 수 없어요."]);
  }
  if (data.version > EXPORT_VERSION) {
    return emptyResult("json", [
      `더 새로운 버전(v${data.version})의 파일이에요. 앱을 최신으로 업데이트한 뒤 다시 시도해주세요.`,
    ]);
  }
  if (!Array.isArray(data.words) || data.words.length === 0) {
    return emptyResult("json", ["가져올 단어가 없어요."]);
  }
  if (data.words.length > IMPORT_MAX_ROWS) {
    return emptyResult("json", [
      `단어가 너무 많아요(${data.words.length}개). 한 번에 ${IMPORT_MAX_ROWS.toLocaleString()}개까지 가져올 수 있어요.`,
    ]);
  }

  const warnings: string[] = [];
  const { books, keyToBookNames } = parseJsonBooks(data.books, warnings);

  const rows: ParsedRow[] = data.words.map((entry, index) => {
    const rowNumber = index + 1;
    if (!isRecord(entry)) {
      return {
        rowNumber,
        preview: { word: "", reading: "", meanings: "" },
        item: null,
        bookNames: [],
        errors: ["단어 정보 형식이 올바르지 않아요."],
      };
    }

    const errors: string[] = [];
    let progress: unknown = null;
    if (entry.progress !== undefined && entry.progress !== null) {
      const parsedProgress = importProgressSchema.safeParse(entry.progress);
      if (parsedProgress.success) progress = parsedProgress.data;
      else errors.push("학습 기록 형식이 올바르지 않아요.");
    }

    const result = importWordSchema.safeParse({
      word: asString(entry.word),
      reading: asString(entry.reading),
      partOfSpeech: asString(entry.partOfSpeech).trim() || DEFAULT_PART_OF_SPEECH,
      jlptLevel: typeof entry.jlptLevel === "string" ? entry.jlptLevel : null,
      meanings: Array.isArray(entry.meanings) ? entry.meanings.map(asString) : [],
      examples: Array.isArray(entry.examples)
        ? entry.examples.map((example) =>
            isRecord(example)
              ? { japanese: asString(example.japanese), korean: asString(example.korean) }
              : { japanese: "", korean: "" },
          )
        : [],
      tags: Array.isArray(entry.tags) ? entry.tags.map(asString) : [],
      isFavorite: entry.isFavorite === true,
      progress,
    });
    if (!result.success) errors.push(...zodMessages(result.error));

    const key = typeof entry.key === "string" ? entry.key : null;
    return {
      rowNumber,
      preview: {
        word: asString(entry.word),
        reading: asString(entry.reading),
        meanings: Array.isArray(entry.meanings) ? entry.meanings.map(asString).join(", ") : "",
      },
      item: errors.length === 0 && result.success ? result.data : null,
      bookNames: key ? [...new Set(keyToBookNames.get(key) ?? [])] : [],
      errors,
    };
  });

  return { format: "json", rows, books, fileErrors: [], warnings };
}

// ---------------------------------------------------------------- 중복/요약

/** 같은 단어+읽기가 파일 안에 여러 번 나오면 첫 번째만 남기고 나머지를 알려준다. */
export function findFileDuplicates(rows: ParsedRow[]): Map<number, number> {
  const firstSeen = new Map<string, number>();
  const duplicates = new Map<number, number>();
  for (const row of rows) {
    if (!row.item) continue;
    const key = `${row.item.word}::${row.item.reading}`;
    const first = firstSeen.get(key);
    if (first === undefined) firstSeen.set(key, row.rowNumber);
    else duplicates.set(row.rowNumber, first);
  }
  return duplicates;
}

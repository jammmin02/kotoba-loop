import { toCsv } from "@/lib/admin/csv";

import { EXPORT_FORMAT, EXPORT_VERSION } from "./parse";

import type { ImportProgress } from "./schema";

export interface ExportWord {
  word: string;
  reading: string;
  partOfSpeech: string;
  jlptLevel: string | null;
  meanings: string[];
  examples: { japanese: string; korean: string }[];
  tags: string[];
  isFavorite: boolean;
  /** 이 단어가 들어 있는 (내) 단어장 이름. */
  bookNames: string[];
  progress: ImportProgress | null;
}

export interface ExportBook {
  name: string;
  description: string | null;
  isPublic: boolean;
  color: string | null;
}

export const CSV_HEADER = [
  "단어",
  "읽기",
  "뜻",
  "품사",
  "JLPT",
  "예문(일본어)",
  "예문(한국어)",
  "태그",
  "단어장",
];

/**
 * CSV 한 칸 안의 목록은 `;`로 구분하므로, 값 자체에 들어 있는 반각 `;`는 전각 `；`로 바꿔 쓴다.
 * 그래야 다시 가져올 때 값이 여러 개로 쪼개지지 않는다.
 */
function listCell(values: string[]): string {
  return values.map((value) => value.replaceAll(";", "；")).join("; ");
}

/**
 * 스프레드시트에서 편집하기 쉬운 단순 표. 예문은 첫 번째 한 쌍만 담고, 학습 기록·즐겨찾기는 담지
 * 않는다(전부 필요하면 JSON). 수식 주입 방어와 BOM은 `toCsv`가 처리한다.
 */
export function buildExportCsv(words: ExportWord[]): string {
  return toCsv(
    CSV_HEADER,
    words.map((word) => [
      word.word,
      word.reading,
      listCell(word.meanings),
      word.partOfSpeech,
      word.jlptLevel ?? "",
      word.examples[0]?.japanese ?? "",
      word.examples[0]?.korean ?? "",
      listCell(word.tags),
      listCell(word.bookNames),
    ]),
  );
}

/** 학습 기록을 포함한 전체 백업. 단어장 구성은 단어 `key` 목록으로 연결한다. */
export function buildExportJson(args: {
  words: ExportWord[];
  books: ExportBook[];
  exportedAt: string;
}): string {
  const keyed = args.words.map((word, index) => ({ key: `w${index + 1}`, ...word }));

  return JSON.stringify(
    {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: args.exportedAt,
      books: args.books.map((book) => ({
        ...book,
        wordKeys: keyed
          .filter((word) => word.bookNames.includes(book.name))
          .map((word) => word.key),
      })),
      words: keyed.map(({ bookNames, ...word }) => {
        void bookNames; // 단어장 소속은 books[].wordKeys로 표현한다.
        return word;
      }),
    },
    null,
    2,
  );
}

/** 다운로드 파일 이름. 한글 이름 때문에 헤더 인코딩이 꼬이지 않도록 항상 ASCII다. */
export function exportFileName(scope: "all" | "book", format: "json" | "csv", date: Date): string {
  const stamp = date.toISOString().slice(0, 10);
  return `kotoba-loop-${scope === "book" ? "book" : "words"}-${stamp}.${format}`;
}

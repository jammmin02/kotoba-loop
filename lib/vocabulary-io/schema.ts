import { z } from "zod";

import { MAX_STAGE } from "@/lib/srs/constants";
import { TAG_NAME_MAX } from "@/lib/validations/tag";
import {
  EXAMPLE_MAX,
  JLPT_LEVEL_OPTIONS,
  MAX_EXAMPLES,
  MAX_MEANINGS,
  MEANING_MAX,
  VOCABULARY_READING_MAX,
  VOCABULARY_WORD_MAX,
} from "@/lib/validations/vocabulary";

/**
 * 단어 가져오기/내보내기의 공용 규칙. 필드 길이·개수는 단어 등록 화면(`lib/validations/vocabulary`)과
 * 같은 상수를 써서, 가져온 단어가 직접 등록한 단어와 다른 제약을 갖지 않게 한다. 클라이언트(미리보기)와
 * 서버(저장)가 같은 스키마로 검증한다.
 */
export const IMPORT_MAX_ROWS = 5000;
export const IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
/** 한 번의 요청으로 저장하는 단어 수 — 원격 DB 트랜잭션이 시간 안에 끝나도록 나눠 보낸다. */
export const IMPORT_CHUNK_SIZE = 50;
export const MAX_TAGS_PER_WORD = 20;
export const MAX_BOOKS_PER_WORD = 20;
export const PART_OF_SPEECH_MAX = 20;
/** 품사 칸이 비어 있을 때 쓰는 값(단어 등록 화면의 선택지에도 있다). */
export const DEFAULT_PART_OF_SPEECH = "기타";

export const LEARNING_STATUS_VALUES = ["NEW", "LEARNING", "REVIEW", "WEAK", "MASTERED"] as const;

const isoDateTime = z.string().datetime({ offset: true });

export const importProgressSchema = z.object({
  learningStatus: z.enum(LEARNING_STATUS_VALUES),
  intervalStage: z.number().int().min(0).max(MAX_STAGE),
  nextReviewAt: isoDateTime.nullable(),
  lastReviewedAt: isoDateTime.nullable(),
  correctCount: z.number().int().min(0).max(1_000_000),
  wrongCount: z.number().int().min(0).max(1_000_000),
});

export type ImportProgress = z.infer<typeof importProgressSchema>;

/** 파일에서 읽은 단어 한 개의 내용. 어느 단어장에 넣을지는 가져오는 쪽이 정한다. */
export const importWordSchema = z.object({
  word: z
    .string()
    .trim()
    .min(1, "단어가 비어 있어요.")
    .max(VOCABULARY_WORD_MAX, `단어는 ${VOCABULARY_WORD_MAX}자 이하여야 해요.`),
  reading: z
    .string()
    .trim()
    .min(1, "읽기가 비어 있어요.")
    .max(VOCABULARY_READING_MAX, `읽기는 ${VOCABULARY_READING_MAX}자 이하여야 해요.`),
  partOfSpeech: z
    .string()
    .trim()
    .min(1, "품사가 비어 있어요.")
    .max(PART_OF_SPEECH_MAX, `품사는 ${PART_OF_SPEECH_MAX}자 이하여야 해요.`),
  jlptLevel: z.enum(JLPT_LEVEL_OPTIONS).nullable(),
  meanings: z
    .array(z.string().trim().min(1).max(MEANING_MAX, `뜻은 하나당 ${MEANING_MAX}자 이하여야 해요.`))
    .min(1, "뜻이 비어 있어요.")
    .max(MAX_MEANINGS, `뜻은 ${MAX_MEANINGS}개까지 넣을 수 있어요.`),
  examples: z
    .array(
      z.object({
        japanese: z.string().trim().min(1, "일본어 예문이 비어 있어요.").max(EXAMPLE_MAX),
        korean: z.string().trim().min(1, "예문 해석이 비어 있어요.").max(EXAMPLE_MAX),
      }),
    )
    .max(MAX_EXAMPLES, `예문은 ${MAX_EXAMPLES}개까지 넣을 수 있어요.`),
  tags: z
    .array(z.string().trim().min(1).max(TAG_NAME_MAX, `태그는 ${TAG_NAME_MAX}자 이하여야 해요.`))
    .max(MAX_TAGS_PER_WORD, `태그는 ${MAX_TAGS_PER_WORD}개까지 넣을 수 있어요.`),
  isFavorite: z.boolean(),
  /** 학습 기록. 파일에 없으면 null(새 단어로 시작). 실제 반영 여부는 가져오기 옵션이 정한다. */
  progress: importProgressSchema.nullable(),
});

export type ImportWord = z.infer<typeof importWordSchema>;

export const DUPLICATE_POLICIES = ["skip", "overwrite", "keep-both"] as const;
export type DuplicatePolicy = (typeof DUPLICATE_POLICIES)[number];

/** 서버에 보내는 항목: 단어 내용 + 넣을 (내 소유의) 단어장 id들. */
export const importItemSchema = importWordSchema.extend({
  bookIds: z
    .array(z.string().min(1))
    .min(1, "단어장을 하나 이상 선택해주세요.")
    .max(MAX_BOOKS_PER_WORD),
});

export type ImportItem = z.infer<typeof importItemSchema>;

/**
 * 항목은 일단 `unknown`으로 받아 서버가 하나씩 검증한다 — 한 항목이 잘못돼도 요청 전체가 거부되지
 * 않고, 그 항목만 "실패"로 보고되게 하려는 것이다.
 */
export const importChunkSchema = z.object({
  duplicatePolicy: z.enum(DUPLICATE_POLICIES),
  includeProgress: z.boolean(),
  items: z.array(z.unknown()).min(1).max(IMPORT_CHUNK_SIZE),
});

export type ImportChunkInput = z.infer<typeof importChunkSchema>;

export type ImportItemStatus = "created" | "overwritten" | "kept-both" | "skipped" | "failed";

export interface ImportItemResult {
  status: ImportItemStatus;
  /** skipped/failed일 때의 사유. */
  reason?: string;
}

export interface ImportChunkResult {
  results: ImportItemResult[];
  counts: Record<ImportItemStatus, number>;
}

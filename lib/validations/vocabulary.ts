import { z } from "zod";

export const PART_OF_SPEECH_OPTIONS = [
  "명사",
  "동사",
  "い형용사",
  "な형용사",
  "부사",
  "조사",
  "접속사",
  "감동사",
  "기타",
] as const;

export const JLPT_LEVEL_OPTIONS = ["N5", "N4", "N3", "N2", "N1"] as const;

export const VOCABULARY_WORD_MAX = 50;
export const VOCABULARY_READING_MAX = 100;
export const MEANING_MAX = 100;
export const MAX_MEANINGS = 10;
export const EXAMPLE_MAX = 300;
export const MAX_EXAMPLES = 10;
export const EXAMPLE_SOURCE_MAX = 50;

const jlptLevelEnum = z.enum(JLPT_LEVEL_OPTIONS);

export const exampleSentenceSchema = z.object({
  japanese: z.string().trim().min(1, "일본어 예문을 입력해주세요.").max(EXAMPLE_MAX),
  korean: z.string().trim().min(1, "한국어 해석을 입력해주세요.").max(EXAMPLE_MAX),
});

export const addExampleSentenceSchema = exampleSentenceSchema.extend({
  source: z.string().trim().min(1).max(EXAMPLE_SOURCE_MAX).optional(),
});

export type AddExampleSentenceInput = z.infer<typeof addExampleSentenceSchema>;

export const vocabularySchema = z.object({
  word: z
    .string()
    .trim()
    .min(1, "단어를 입력해주세요.")
    .max(VOCABULARY_WORD_MAX, `단어는 ${VOCABULARY_WORD_MAX}자 이하여야 합니다.`),
  reading: z
    .string()
    .trim()
    .min(1, "후리가나를 입력해주세요.")
    .max(VOCABULARY_READING_MAX, `후리가나는 ${VOCABULARY_READING_MAX}자 이하여야 합니다.`),
  partOfSpeech: z.string().trim().min(1, "품사를 선택해주세요."),
  jlptLevel: jlptLevelEnum.nullable(),
  meanings: z
    .array(z.string().trim().min(1).max(MEANING_MAX))
    .min(1, "뜻을 1개 이상 입력해주세요.")
    .max(MAX_MEANINGS, `뜻은 ${MAX_MEANINGS}개까지 등록할 수 있습니다.`),
  examples: z
    .array(exampleSentenceSchema)
    .max(MAX_EXAMPLES, `예문은 ${MAX_EXAMPLES}개까지 등록할 수 있습니다.`),
  vocabularyBookIds: z.array(z.string().min(1)).min(1, "단어장을 1개 이상 선택해주세요."),
});

export type VocabularyInput = z.infer<typeof vocabularySchema>;

export const vocabularyCreateSchema = vocabularySchema.extend({
  aiAnalysisId: z.string().min(1).optional(),
  aiFieldsEdited: z.boolean().optional(),
});

export type VocabularyCreateInput = z.infer<typeof vocabularyCreateSchema>;

/** `POST /api/vocabularies/[id]/add-to-book` — 이미 존재하는(내 소유가 아닐 수도 있는)
 * Vocabulary를 내 단어장에 연결할 때 쓴다. word/reading 등은 이미 있는 값을 그대로 쓰므로
 * 다시 받지 않고, 어느 단어장에 넣을지만 받는다. */
export const addVocabularyToBookSchema = z.object({
  vocabularyBookIds: z.array(z.string().min(1)).min(1, "단어장을 1개 이상 선택해주세요."),
});

export type AddVocabularyToBookInput = z.infer<typeof addVocabularyToBookSchema>;

/** 사진 단어장 검수(PROMPT 31) 화면에서 한 번에 검토·저장하는 최대 단어 수. 한 장의 사진이
 * 만들어낼 수 있는 최대 후보 수(`MAX_OCR_WORDS`, lib/ai/ocr-word-extraction.ts)와 반드시
 * 같거나 커야 한다 — 이 값이 더 작으면 AI가 60개까지 정상적으로 추출·분석해준 단어를 사용자가
 * 전체 선택했을 때 저장 요청 자체가 통째로 거부된다(PROMPT 37 통합 회귀에서 발견한 버그). */
export const BULK_SAVE_MAX_ITEMS = 60;

export const duplicateCheckItemSchema = z.object({
  word: z.string().trim().min(1).max(VOCABULARY_WORD_MAX),
  reading: z.string().trim().min(1).max(VOCABULARY_READING_MAX),
});

export const checkDuplicatesSchema = z.object({
  items: z.array(duplicateCheckItemSchema).min(1).max(BULK_SAVE_MAX_ITEMS),
});

export type CheckDuplicatesInput = z.infer<typeof checkDuplicatesSchema>;

/**
 * 계획서 27장의 3가지 중복 처리 선택지 — "create"(새 단어로 저장), "skip"(기존 단어 유지),
 * "link"(기존 단어를 신규 생성 없이 대상 단어장에만 연결). 각 선택지가 실제로 필요로 하는
 * 필드가 달라(예: skip/link는 meanings/examples가 필요 없다) discriminated union으로
 * 나눠 요청 단계에서부터 형태를 강제한다.
 */
export const bulkSaveItemSchema = z.discriminatedUnion("resolution", [
  z.object({
    resolution: z.literal("skip"),
    word: z.string().trim().min(1).max(VOCABULARY_WORD_MAX),
    reading: z.string().trim().min(1).max(VOCABULARY_READING_MAX),
  }),
  z.object({
    resolution: z.literal("link"),
    word: z.string().trim().min(1).max(VOCABULARY_WORD_MAX),
    reading: z.string().trim().min(1).max(VOCABULARY_READING_MAX),
    existingVocabularyId: z.string().min(1),
  }),
  z.object({
    resolution: z.literal("create"),
    word: z
      .string()
      .trim()
      .min(1, "단어를 입력해주세요.")
      .max(VOCABULARY_WORD_MAX, `단어는 ${VOCABULARY_WORD_MAX}자 이하여야 합니다.`),
    reading: z
      .string()
      .trim()
      .min(1, "후리가나를 입력해주세요.")
      .max(VOCABULARY_READING_MAX, `후리가나는 ${VOCABULARY_READING_MAX}자 이하여야 합니다.`),
    partOfSpeech: z.string().trim().min(1, "품사를 선택해주세요."),
    jlptLevel: jlptLevelEnum.nullable(),
    meanings: z
      .array(z.string().trim().min(1).max(MEANING_MAX))
      .min(1, "뜻을 1개 이상 입력해주세요.")
      .max(MAX_MEANINGS, `뜻은 ${MAX_MEANINGS}개까지 등록할 수 있습니다.`),
    examples: z
      .array(exampleSentenceSchema)
      .max(MAX_EXAMPLES, `예문은 ${MAX_EXAMPLES}개까지 등록할 수 있습니다.`),
    aiAnalysisId: z.string().min(1).optional(),
    aiFieldsEdited: z.boolean().optional(),
  }),
]);

export type BulkSaveItemInput = z.infer<typeof bulkSaveItemSchema>;

export const bulkSaveSchema = z.object({
  vocabularyBookIds: z.array(z.string().min(1)).min(1, "단어장을 1개 이상 선택해주세요."),
  items: z.array(bulkSaveItemSchema).min(1).max(BULK_SAVE_MAX_ITEMS),
});

export type BulkSaveInput = z.infer<typeof bulkSaveSchema>;

export const vocabularyListQuerySchema = z.object({
  bookId: z.string().min(1).optional(),
  /** 쉼표로 구분한 여러 단어장 id(커스텀 학습의 다중 선택용). bookId와 동시에 와도 둘 다 반영된다. */
  bookIds: z
    .string()
    .min(1)
    .optional()
    .transform((value) => (value ? value.split(",").filter(Boolean) : undefined)),
  status: z.enum(["NEW", "LEARNING", "REVIEW", "WEAK", "MASTERED"]).optional(),
  tagId: z.string().min(1).optional(),
  favorite: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

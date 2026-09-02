import { z } from "zod";

import { VOCABULARY_WORD_MAX } from "@/lib/validations/vocabulary";

export const analyzeWordSchema = z.object({
  word: z
    .string()
    .trim()
    .min(1, "단어를 입력해주세요.")
    .max(VOCABULARY_WORD_MAX, `단어는 ${VOCABULARY_WORD_MAX}자 이하여야 합니다.`),
});

export type AnalyzeWordInput = z.infer<typeof analyzeWordSchema>;

/** 계획서 19장의 상황별 예문 생성 6종. */
export const SITUATION_OPTIONS = [
  "일상회화",
  "비즈니스",
  "JLPT",
  "친구와 대화",
  "학교",
  "여행",
] as const;

export type Situation = (typeof SITUATION_OPTIONS)[number];

export const generateExampleSchema = z.object({
  situation: z.enum(SITUATION_OPTIONS, { message: "상황을 선택해주세요." }),
});

export type GenerateExampleInput = z.infer<typeof generateExampleSchema>;

/** PROMPT 42(계획서 39장) 자연어 단어 검색 질의 길이 제한. */
export const NATURAL_SEARCH_QUERY_MAX = 200;

export const naturalSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "질문을 입력해주세요.")
    .max(NATURAL_SEARCH_QUERY_MAX, `질문은 ${NATURAL_SEARCH_QUERY_MAX}자 이하여야 합니다.`),
});

export type NaturalSearchInput = z.infer<typeof naturalSearchSchema>;

/** PROMPT 41(계획서 38장) 표현 비교 — 한 번에 비교할 수 있는 단어 개수 범위. */
export const COMPARE_WORDS_MIN = 2;
export const COMPARE_WORDS_MAX = 5;

export const compareWordsSchema = z.object({
  words: z
    .array(
      z
        .string()
        .trim()
        .min(1, "단어를 입력해주세요.")
        .max(VOCABULARY_WORD_MAX, `단어는 ${VOCABULARY_WORD_MAX}자 이하여야 합니다.`),
    )
    .min(COMPARE_WORDS_MIN, `단어를 ${COMPARE_WORDS_MIN}개 이상 선택해주세요.`)
    .max(COMPARE_WORDS_MAX, `단어는 최대 ${COMPARE_WORDS_MAX}개까지 비교할 수 있습니다.`)
    .refine(
      (words) => new Set(words).size === words.length,
      "같은 단어를 중복해서 선택할 수 없습니다.",
    ),
});

export type CompareWordsInput = z.infer<typeof compareWordsSchema>;

/** PROMPT 48(계획서 43장) 한자 기억법 생성 — 캐시를 무시하고 새로 생성할지 여부. */
export const kanjiMnemonicRequestSchema = z.object({
  regenerate: z.boolean().optional(),
});

export type KanjiMnemonicRequestInput = z.infer<typeof kanjiMnemonicRequestSchema>;

/** 단어 사전 화면에서 특정 단어에 대해 AI에게 이어서 묻는 채팅 한 턴의 길이 제한. */
export const WORD_CHAT_QUESTION_MAX = 200;
export const WORD_CHAT_ANSWER_MAX = 500;
export const WORD_CHAT_HISTORY_MAX = 12;

export const wordChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(WORD_CHAT_ANSWER_MAX),
});

export const wordChatSchema = z.object({
  word: z
    .string()
    .trim()
    .min(1, "단어를 입력해주세요.")
    .max(VOCABULARY_WORD_MAX, `단어는 ${VOCABULARY_WORD_MAX}자 이하여야 합니다.`),
  question: z
    .string()
    .trim()
    .min(1, "질문을 입력해주세요.")
    .max(WORD_CHAT_QUESTION_MAX, `질문은 ${WORD_CHAT_QUESTION_MAX}자 이하여야 합니다.`),
  history: z.array(wordChatMessageSchema).max(WORD_CHAT_HISTORY_MAX).optional(),
});

export type WordChatInput = z.infer<typeof wordChatSchema>;

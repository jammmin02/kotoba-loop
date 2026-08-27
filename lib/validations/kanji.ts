import { z } from "zod";

import { JLPT_LEVEL_OPTIONS } from "@/lib/validations/vocabulary";

export const KANJI_QUERY_MAX = 50;
export const KANJI_PAGE_SIZE_DEFAULT = 48;
export const KANJI_PAGE_SIZE_MAX = 100;

/** 常用漢字 학년 분류 값(계획서 32장) — 1~6은 초등, 8은 중학교 이상. */
export const KANJI_SCHOOL_GRADES = [1, 2, 3, 4, 5, 6, 8] as const;

/**
 * `grade`(常用漢字 학년)와 `jlpt`(구JLPT 급수 환산)는 계획서 32장이 "서로 다른 분류
 * 체계"라고 명시한 별도 기준이라, 항상 둘 중 하나만 필터로 받는다 — 동시에 보내면
 * 어느 분류를 기준으로 할지 모호해지므로 검증 단계에서 막는다(두 분류가 섞이지 않게).
 */
export const kanjiListQuerySchema = z
  .object({
    q: z.string().trim().max(KANJI_QUERY_MAX).optional(),
    grade: z.coerce
      .number()
      .int()
      .refine((v) => (KANJI_SCHOOL_GRADES as readonly number[]).includes(v))
      .optional(),
    jlpt: z.enum(JLPT_LEVEL_OPTIONS).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(KANJI_PAGE_SIZE_MAX).default(KANJI_PAGE_SIZE_DEFAULT),
  })
  .refine((v) => !(v.grade !== undefined && v.jlpt !== undefined), {
    message: "학년과 JLPT 분류는 동시에 지정할 수 없습니다.",
  });

export type KanjiListQueryInput = z.infer<typeof kanjiListQuerySchema>;

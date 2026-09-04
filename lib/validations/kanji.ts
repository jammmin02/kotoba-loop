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
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(KANJI_PAGE_SIZE_MAX)
      .default(KANJI_PAGE_SIZE_DEFAULT),
  })
  .refine((v) => !(v.grade !== undefined && v.jlpt !== undefined), {
    message: "학년과 JLPT 분류는 동시에 지정할 수 없습니다.",
  });

export type KanjiListQueryInput = z.infer<typeof kanjiListQuerySchema>;

/**
 * `GET /api/kanji/practice-pool`(한자 퀴즈 연습 모드 — 전체 랜덤/학년·JLPT/커스텀) 쿼리 검증.
 * 페이지네이션이 없다 — 셔플링/커스텀 선택의 재료가 될 id 목록 전체가 필요해서, 이미
 * `getTodayKanjiQueue`(lib/study/queries.ts)가 하듯 常用漢字 전량을 한 번에 불러온다.
 */
export const kanjiPracticePoolQuerySchema = z
  .object({
    q: z.string().trim().max(KANJI_QUERY_MAX).optional(),
    grade: z.coerce
      .number()
      .int()
      .refine((v) => (KANJI_SCHOOL_GRADES as readonly number[]).includes(v))
      .optional(),
    jlpt: z.enum(JLPT_LEVEL_OPTIONS).optional(),
    // `z.coerce.boolean()`은 "false" 문자열도 true로 만들어버려("false"는 빈 문자열이
    // 아니므로) 값 자체를 비교해야 한다 — 파라미터가 없으면 undefined로 취급한다.
    favoritesOnly: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    // 전체 랜덤/학년·JLPT 모드가 오늘의 학습 페이싱(DAILY_KANJI_TARGET)을 건너뛰고 아직
    // 한 번도 리뷰하지 않은 한자까지 SRS 추적을 시작해버리지 않도록, 이미 리뷰한 적 있는
    // 한자(learning_status !== "NEW")로만 풀을 제한할 때 쓴다. 커스텀 모드(직접 검색/선택)는
    // 사용자가 의도적으로 고르는 것이라 이 제한을 적용하지 않는다.
    seenOnly: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
  })
  .refine((v) => !(v.grade !== undefined && v.jlpt !== undefined), {
    message: "학년과 JLPT 분류는 동시에 지정할 수 없습니다.",
  });

export type KanjiPracticePoolQueryInput = z.infer<typeof kanjiPracticePoolQuerySchema>;

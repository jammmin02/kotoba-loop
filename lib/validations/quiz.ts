import { z } from "zod";

import { QUIZ_TARGET_TYPES, QUIZ_TYPES } from "@/lib/quiz/types";

export const QUIZ_SESSION_MAX_IDS = 100;

export const quizSessionRequestSchema = z.object({
  /** 생략 시 단어 세션(기존 호출부 호환). PROMPT 36부터 "kanji"도 지원한다. */
  targetType: z.enum(QUIZ_TARGET_TYPES).default("vocab"),
  targetIds: z
    .array(z.string().min(1))
    .min(1, "학습할 항목을 선택해주세요.")
    .max(QUIZ_SESSION_MAX_IDS),
  /** 지정하면 이 유형들로만 문제를 낸다("게임 종류 선택" 커스텀 학습용). 생략 시 전체 유형. */
  quizTypes: z.array(z.enum(QUIZ_TYPES)).min(1).optional(),
});

export type QuizSessionRequestInput = z.infer<typeof quizSessionRequestSchema>;

const quizChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

/**
 * 문제 생성에 랜덤 요소(보기 순서/예문 선택 등)가 섞여 있어, 제출 시점에 서버가 문제를
 * 그대로 재생성할 수 없다(`generateQuestion`을 다시 호출하면 다른 문제가 나온다). 그래서
 * `POST /api/quiz/session`이 만든 문제를 클라이언트가 들고 있다가 제출 시 함께 돌려보내는
 * 방식으로 채점한다 — 별도 서버 세션 저장소 없이 무상태를 유지하기 위한 선택이다(추가 결정
 * 필요 항목의 기본값). 이는 PROMPT 18 플래시카드가 SRS 평가(grade)를 전적으로 클라이언트
 * 신고에 맡기는 것과 같은 신뢰 모델이다 — 자기 학습 앱이라 부정행위의 실익이 없다.
 */
export const quizQuestionSchema = z.object({
  quizType: z.enum(QUIZ_TYPES),
  targetType: z.enum(QUIZ_TARGET_TYPES),
  targetId: z.string().min(1),
  prompt: z.string().min(1),
  choices: z.array(quizChoiceSchema).optional(),
  correctAnswer: z.string().min(1),
  acceptableAnswers: z.array(z.string()).optional(),
});

export const QUIZ_ANSWER_MAX_LENGTH = 200;
/** 한 문제에 10분 넘게 걸렸다면 응답 시간 기록으로서 의미가 없다고 보고 상한을 둔다. */
export const QUIZ_RESPONSE_TIME_MAX_MS = 10 * 60 * 1000;

export const quizSubmitSchema = z.object({
  question: quizQuestionSchema,
  userAnswer: z.string().max(QUIZ_ANSWER_MAX_LENGTH),
  responseTimeMs: z.number().int().min(0).max(QUIZ_RESPONSE_TIME_MAX_MS),
  /** 클라이언트가 문제당 한 번 생성해 재시도에도 그대로 재사용하는 idempotency key(PROMPT 37) —
   * 타임아웃 후 자동 재시도가 서버에 이미 성공한 요청을 한 번 더 보내도 이중 채점/이중 EXP
   * 지급이 되지 않도록, 서버가 `ReviewHistory.request_id` 유니크 제약으로 걸러낸다. */
  requestId: z.string().uuid(),
});

export type QuizSubmitInput = z.infer<typeof quizSubmitSchema>;

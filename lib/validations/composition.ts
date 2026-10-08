import { z } from "zod";

import {
  COMPOSITION_ANSWER_MAX,
  COMPOSITION_CUSTOM_MAX,
  COMPOSITION_CUSTOM_MIN,
  COMPOSITION_EXCLUDE_MAX,
  COMPOSITION_LEVELS,
  COMPOSITION_MODES,
  COMPOSITION_PROMPT_MAX,
  COMPOSITION_SITUATIONS,
  COMPOSITION_TONES,
  COMPOSITION_VOCAB_LEVELS,
} from "@/lib/composition/config";

export const createCompositionSessionSchema = z
  .object({
    situation: z.enum(COMPOSITION_SITUATIONS, { message: "상황을 선택해주세요." }),
    vocabLevel: z.enum(COMPOSITION_VOCAB_LEVELS, { message: "단어 수준을 선택해주세요." }),
    compositionLevel: z.enum(COMPOSITION_LEVELS, { message: "작문 수준을 선택해주세요." }),
    tone: z.enum(COMPOSITION_TONES, { message: "말투를 선택해주세요." }),
    mode: z.enum(COMPOSITION_MODES, { message: "문제 수 방식을 선택해주세요." }),
    customCount: z.number().int().optional(),
  })
  .refine(
    (v) =>
      v.mode !== "CUSTOM" ||
      (v.customCount !== undefined &&
        v.customCount >= COMPOSITION_CUSTOM_MIN &&
        v.customCount <= COMPOSITION_CUSTOM_MAX),
    {
      message: `문제 수는 ${COMPOSITION_CUSTOM_MIN}~${COMPOSITION_CUSTOM_MAX} 사이로 입력해주세요.`,
      path: ["customCount"],
    },
  );

export type CreateCompositionSessionInput = z.infer<typeof createCompositionSessionSchema>;

export const compositionPromptRequestSchema = z.object({
  sessionId: z.string().min(1),
  exclude: z
    .array(z.string().trim().min(1).max(COMPOSITION_PROMPT_MAX))
    .max(COMPOSITION_EXCLUDE_MAX)
    .optional(),
});

export const compositionGradeRequestSchema = z.object({
  sessionId: z.string().min(1),
  promptKorean: z.string().trim().min(1).max(COMPOSITION_PROMPT_MAX),
  hintUsed: z.boolean().optional(),
  answer: z
    .string()
    .trim()
    .min(1, "작문을 입력해주세요.")
    .max(COMPOSITION_ANSWER_MAX, `${COMPOSITION_ANSWER_MAX}자 이내로 입력해주세요.`),
});

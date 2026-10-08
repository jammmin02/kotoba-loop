import { z } from "zod";

import { COMPOSITION_TONES, COMPOSITION_VOCAB_LEVELS } from "@/lib/composition/config";
import {
  CONVERSATION_MESSAGE_MAX,
  CONVERSATION_SCENARIOS,
  CONVERSATION_TURN_OPTIONS,
  isToneAllowed,
} from "@/lib/conversation/config";

export const createConversationSessionSchema = z
  .object({
    scenario: z.enum(CONVERSATION_SCENARIOS, { message: "상황을 선택해주세요." }),
    vocabLevel: z.enum(COMPOSITION_VOCAB_LEVELS, { message: "단어 수준을 선택해주세요." }),
    tone: z.enum(COMPOSITION_TONES, { message: "말투를 선택해주세요." }),
    targetTurns: z
      .number()
      .int()
      .refine((n) => (CONVERSATION_TURN_OPTIONS as readonly number[]).includes(n), {
        message: "대화 턴 수를 선택해주세요.",
      }),
  })
  .refine((v) => isToneAllowed(v.scenario, v.tone), {
    message: "이 상황에서는 선택할 수 없는 말투예요.",
    path: ["tone"],
  });

export type CreateConversationSessionInput = z.infer<typeof createConversationSessionSchema>;

export const conversationSessionRefSchema = z.object({
  sessionId: z.string().min(1),
});

export const conversationTurnRequestSchema = z.object({
  sessionId: z.string().min(1),
  hintUsed: z.boolean().optional(),
  message: z
    .string()
    .trim()
    .min(1, "메시지를 입력해주세요.")
    .max(CONVERSATION_MESSAGE_MAX, `${CONVERSATION_MESSAGE_MAX}자 이내로 입력해주세요.`),
});

import { z } from "zod";

export const sentenceSubmitSchema = z.object({
  sentence: z.string().trim().min(1, "문장을 입력해주세요.").max(200, "200자 이내로 입력해주세요."),
});

export type SentenceSubmitInput = z.infer<typeof sentenceSubmitSchema>;

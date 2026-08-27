import { z } from "zod";

export const createBattleRoomSchema = z.object({
  vocabularyBookId: z.string().min(1),
});

export const submitBattleAnswerSchema = z.object({
  choiceId: z.string().min(1),
});

export type CreateBattleRoomInput = z.infer<typeof createBattleRoomSchema>;
export type SubmitBattleAnswerInput = z.infer<typeof submitBattleAnswerSchema>;

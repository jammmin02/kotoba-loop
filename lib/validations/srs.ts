import { z } from "zod";

import { REVIEW_GRADES } from "@/lib/srs/types";

export const reviewResultSchema = z.object({
  grade: z.enum(REVIEW_GRADES, { message: "평가를 선택해주세요." }),
  requestId: z.string().uuid(),
});

export type ReviewResultInput = z.infer<typeof reviewResultSchema>;

import { z } from "zod";

import { WRONG_NOTE_PERIODS } from "@/lib/study/wrong-notes";

export const wrongNotesQuerySchema = z.object({
  period: z.enum(WRONG_NOTE_PERIODS).default("week"),
});

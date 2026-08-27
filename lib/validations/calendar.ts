import { z } from "zod";

/** 미지정 시 라우트가 서버 기준 오늘(KST)이 속한 달을 기본값으로 채운다. */
export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;

import { z } from "zod";

import { MAX_REPORT_OFFSET } from "@/lib/study/report";

/** 미지정 시 라우트가 "가장 최근에 완결된" 주/월(offset=0)을 기본값으로 채운다. */
export const reportQuerySchema = z.object({
  kind: z.enum(["week", "month"]),
  offset: z.coerce.number().int().min(0).max(MAX_REPORT_OFFSET).optional().default(0),
});

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;

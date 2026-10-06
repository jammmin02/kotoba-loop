import { z } from "zod";

export const REPORT_DETAIL_MAX = 300;

export const reportReasonSchema = z.enum(["SPAM", "ABUSE", "INAPPROPRIATE", "OTHER"]);

export const createReportSchema = z.object({
  targetType: z.enum(["BOOK"]),
  targetId: z.string().uuid(),
  reason: reportReasonSchema,
  detail: z
    .string()
    .trim()
    .max(REPORT_DETAIL_MAX, `상세 내용은 ${REPORT_DETAIL_MAX}자 이하로 입력해주세요.`)
    .optional()
    .transform((value) => value || undefined),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

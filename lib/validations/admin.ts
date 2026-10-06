import { z } from "zod";

export const ADMIN_PAGE_SIZE = 20;

export const adminMemberStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]);

export const adminMembersQuerySchema = z.object({
  status: adminMemberStatusSchema.default("PENDING"),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const adminReviewSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, "대상을 선택해주세요.").max(100),
  action: z.enum(["APPROVE", "REJECT", "SUSPEND", "RESTORE"]),
  reason: z
    .string()
    .trim()
    .max(500, "사유는 500자 이하로 입력해주세요.")
    .optional()
    .transform((value) => value || undefined),
});

export const adminAuditQuerySchema = z.object({
  group: z.enum(["all", "member", "content", "sanction", "report"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
});

export type AdminReviewInput = z.infer<typeof adminReviewSchema>;

const noteSchema = z
  .string()
  .trim()
  .max(500, "사유는 500자 이하로 입력해주세요.")
  .optional()
  .transform((value) => value || undefined);

export const adminReportStatusSchema = z.enum(["OPEN", "RESOLVED", "DISMISSED"]);

export const adminReportsQuerySchema = z.object({
  status: adminReportStatusSchema.default("OPEN"),
  targetType: z.enum(["BOOK"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const adminResolveReportSchema = z.object({
  targetType: z.enum(["BOOK"]),
  targetId: z.string().uuid(),
  contentAction: z.enum(["NONE", "HIDE", "DELETE"]),
  userAction: z.enum(["NONE", "WARN", "RESTRICT_1D", "RESTRICT_7D", "RESTRICT_30D"]),
  note: noteSchema,
});

export const adminContentQuerySchema = z.object({
  filter: z.enum(["all", "visible", "hidden"]).default("all"),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const adminContentActionSchema = z.object({
  bookId: z.string().uuid(),
  action: z.enum(["HIDE", "RESTORE", "DELETE"]),
  reason: noteSchema,
});

export const adminSanctionSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["WARN", "RESTRICT_1D", "RESTRICT_7D", "RESTRICT_30D", "LIFT_RESTRICTION"]),
  reason: noteSchema,
});

export type AdminResolveReportInput = z.infer<typeof adminResolveReportSchema>;
export type AdminContentActionInput = z.infer<typeof adminContentActionSchema>;
export type AdminSanctionInput = z.infer<typeof adminSanctionSchema>;

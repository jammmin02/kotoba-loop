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
  page: z.coerce.number().int().min(1).default(1),
});

export type AdminReviewInput = z.infer<typeof adminReviewSchema>;

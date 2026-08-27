import { z } from "zod";

import { JLPT_LEVELS } from "@/lib/validations/onboarding";

const jlptLevelEnum = z.enum(JLPT_LEVELS);

/** `YYYY-MM-DD` — KST 기준 시험일 하루만 의미가 있고 시각은 저장하지 않는다. */
const examDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식으로 입력해주세요.")
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00+09:00`).getTime()), {
    message: "올바른 날짜가 아닙니다.",
  });

export const examGoalCreateSchema = z.object({
  targetJlpt: jlptLevelEnum,
  examDate: examDateSchema,
  /** 첫 목표는 등록 즉시 활성화되므로(app/api/users/me/exam-goals/route.ts), 이 값은
   * 이미 목표가 있는 상태에서 등록과 동시에 활성 목표로 전환하고 싶을 때만 쓴다. */
  isActive: z.boolean().optional(),
});
export type ExamGoalCreateInput = z.infer<typeof examGoalCreateSchema>;

export const examGoalUpdateSchema = z
  .object({
    targetJlpt: jlptLevelEnum.optional(),
    examDate: examDateSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "수정할 값이 없습니다." });
export type ExamGoalUpdateInput = z.infer<typeof examGoalUpdateSchema>;

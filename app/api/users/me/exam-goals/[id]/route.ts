import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { toKstDateKey } from "@/lib/datetime";
import { db } from "@/lib/db";
import { examGoalUpdateSchema } from "@/lib/validations/exam-goal";
import type { ExamGoalResponse } from "@/types/exam-goal";

import type { NextRequest } from "next/server";

/**
 * 목표가 존재하고 요청자 소유일 때만 반환한다; 둘 다 아닐 때 동일하게 404여서 다른 사용자의
 * 목표 존재 여부를 외부에서 추측할 수 없다(app/api/vocabulary-books/[id]/route.ts와 동일 패턴).
 */
async function requireOwnedExamGoal(id: string, userId: string) {
  const goal = await db.userExamGoal.findUnique({ where: { id } });
  if (!goal || goal.user_id !== userId) {
    throw new ApiError("NOT_FOUND", "시험 목표를 찾을 수 없습니다.");
  }
  return goal;
}

export const PATCH = withApiHandler(
  async (req: NextRequest, ctx: RouteContext<"/api/users/me/exam-goals/[id]">): Promise<ExamGoalResponse> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }
    const userId = session.user.id;

    const { id } = await ctx.params;
    await requireOwnedExamGoal(id, userId);

    const body = await req.json();
    const { targetJlpt, examDate, isActive } = examGoalUpdateSchema.parse(body);

    const goal = await db.$transaction(async (tx) => {
      // 이 목표를 활성으로 전환하면 사용자의 다른 목표는 모두 비활성화한다 — "현재 목표"는
      // 항상 최대 하나라는 불변식(2026-08-25 확정)을 여기서 강제한다.
      if (isActive === true) {
        await tx.userExamGoal.updateMany({
          where: { user_id: userId, is_active: true, id: { not: id } },
          data: { is_active: false },
        });
      }

      return tx.userExamGoal.update({
        where: { id },
        data: {
          ...(targetJlpt !== undefined && { target_jlpt: targetJlpt }),
          ...(examDate !== undefined && { exam_date: new Date(`${examDate}T00:00:00+09:00`) }),
          ...(isActive !== undefined && { is_active: isActive }),
        },
      });
    });

    return {
      id: goal.id,
      targetJlpt: goal.target_jlpt,
      examDate: toKstDateKey(goal.exam_date),
      isActive: goal.is_active,
      createdAt: goal.created_at.toISOString(),
    };
  },
);

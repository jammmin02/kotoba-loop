import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { toKstDateKey } from "@/lib/datetime";
import { db } from "@/lib/db";
import { examGoalCreateSchema } from "@/lib/validations/exam-goal";
import type { ExamGoalResponse } from "@/types/exam-goal";

import type { NextRequest } from "next/server";

function toExamGoalResponse(goal: {
  id: string;
  target_jlpt: string;
  exam_date: Date;
  is_active: boolean;
  created_at: Date;
}): ExamGoalResponse {
  return {
    id: goal.id,
    targetJlpt: goal.target_jlpt,
    examDate: toKstDateKey(goal.exam_date),
    isActive: goal.is_active,
    createdAt: goal.created_at.toISOString(),
  };
}

export const GET = withApiHandler(async (): Promise<ExamGoalResponse[]> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const goals = await db.userExamGoal.findMany({
    where: { user_id: session.user.id },
    orderBy: { exam_date: "asc" },
  });

  return goals.map(toExamGoalResponse);
});

export const POST = withApiHandler(async (req: NextRequest): Promise<ExamGoalResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }
  const userId = session.user.id;

  const body = await req.json();
  const { targetJlpt, examDate, isActive } = examGoalCreateSchema.parse(body);
  const examDateValue = new Date(`${examDate}T00:00:00+09:00`);

  const goal = await db.$transaction(async (tx) => {
    const existingCount = await tx.userExamGoal.count({ where: { user_id: userId } });
    // 사용자의 첫 시험 목표는 등록 즉시 활성화한다 — 그렇지 않으면 "활성 목표 없음" 상태로
    // 남아 추천 계산이 계속 폴백되는데, 목표를 막 하나 등록한 사용자에게는 어색한 경험이다.
    const shouldActivate = isActive === true || existingCount === 0;

    if (shouldActivate) {
      await tx.userExamGoal.updateMany({
        where: { user_id: userId, is_active: true },
        data: { is_active: false },
      });
    }

    return tx.userExamGoal.create({
      data: {
        user_id: userId,
        target_jlpt: targetJlpt,
        exam_date: examDateValue,
        is_active: shouldActivate,
      },
    });
  });

  return toExamGoalResponse(goal);
});

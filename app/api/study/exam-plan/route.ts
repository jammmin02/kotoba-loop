import { explainExamPlan } from "@/lib/ai/exam-plan-explanation";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { toKstDateKey } from "@/lib/datetime";
import { getExamPlanRecommendation } from "@/lib/study/exam-plan-query";
import type { ExamPlanResponse } from "@/types/exam-goal";

export const GET = withApiHandler(async (): Promise<ExamPlanResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const now = new Date();
  const recommendation = await getExamPlanRecommendation(session.user.id, now);
  if (recommendation.status === "no_active_goal") {
    return { status: "no_active_goal" };
  }

  const { activeGoal, daysRemaining, plan } = recommendation;

  // AI 코멘트 실패는 수치 카드 전체를 죽이지 않고 comment만 null로 폴백한다(취약점 분석
  // 라우트와 동일한 패턴) — 페이지 로드 경로라 사용자가 직접 재시도를 트리거하지 않는다.
  let comment: string | null = null;
  try {
    const { result } = await explainExamPlan(session.user.id, activeGoal.id, toKstDateKey(now), {
      targetJlpt: activeGoal.targetJlpt,
      daysRemaining,
      plan,
    });
    comment = result.comment;
  } catch (err) {
    console.error("[exam-plan] AI 설명 생성 실패", err);
  }

  return { status: "ok", activeGoal, daysRemaining, plan, comment };
});

import "server-only";

import { startOfKstDay, toKstDateKey } from "@/lib/datetime";
import { db } from "@/lib/db";
import { computeRecommendedPlan, selectActiveExamGoal } from "@/lib/study/exam-plan";
import type { RecommendedPlan } from "@/lib/study/exam-plan";
import { getKanjiStatusCounts, getWordStatusCounts } from "@/lib/study/stats";
import { ONBOARDING_DEFAULTS } from "@/lib/validations/onboarding";

export interface ActiveExamGoalView {
  id: string;
  targetJlpt: string;
  /** `YYYY-MM-DD` (KST). */
  examDate: string;
  isActive: boolean;
  createdAt: string;
}

export type ExamPlanQueryResult =
  | {
      status: "ok";
      activeGoal: ActiveExamGoalView;
      daysRemaining: number;
      plan: RecommendedPlan;
    }
  | { status: "no_active_goal" };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * `GET /api/study/exam-plan`이 쓰는 데이터 조합 지점 — 사용자의 시험 목표 중 오늘의 활성
 * 목표를 고르고(lib/study/exam-plan.ts), 현재 단어/한자 진행률(PROMPT 22/35가 이미 만든
 * getWordStatusCounts/getKanjiStatusCounts를 재사용)과 남은 기간으로 추천 학습량을 계산한다.
 */
export async function getExamPlanRecommendation(
  userId: string,
  now: Date,
): Promise<ExamPlanQueryResult> {
  const startOfToday = startOfKstDay(now);

  const [goals, user, wordCounts, kanjiCounts] = await Promise.all([
    db.userExamGoal.findMany({ where: { user_id: userId } }),
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { daily_study_time: true } }),
    getWordStatusCounts(userId),
    getKanjiStatusCounts(userId),
  ]);

  const candidates = goals.map((goal) => ({
    id: goal.id,
    isActive: goal.is_active,
    examDate: goal.exam_date,
    targetJlpt: goal.target_jlpt,
    createdAt: goal.created_at,
  }));
  const activeGoal = selectActiveExamGoal(candidates, startOfToday);
  if (!activeGoal) {
    return { status: "no_active_goal" };
  }

  const daysRemaining = Math.max(
    1,
    Math.round((activeGoal.examDate.getTime() - startOfToday.getTime()) / MS_PER_DAY),
  );

  const availableMinutes = user.daily_study_time ?? ONBOARDING_DEFAULTS.dailyStudyTime;
  const backlogKanji = kanjiCounts.total - kanjiCounts.mastered;

  const plan = computeRecommendedPlan({
    daysRemaining,
    backlogNewWords: wordCounts.new,
    backlogReviewWords: wordCounts.learning + wordCounts.review + wordCounts.weak,
    backlogKanji,
    availableMinutes,
  });

  return {
    status: "ok",
    activeGoal: {
      id: activeGoal.id,
      targetJlpt: activeGoal.targetJlpt,
      examDate: toKstDateKey(activeGoal.examDate),
      isActive: activeGoal.isActive,
      createdAt: activeGoal.createdAt.toISOString(),
    },
    daysRemaining,
    plan,
  };
}

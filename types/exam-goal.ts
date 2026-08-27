import type { RecommendedPlan } from "@/lib/study/exam-plan";

/** `GET/POST/PATCH /api/users/me/exam-goals` — MY 화면(PROMPT 25-A)의 시험 목표 목록/CRUD. */
export interface ExamGoalResponse {
  id: string;
  targetJlpt: string;
  /** `YYYY-MM-DD` (KST). */
  examDate: string;
  isActive: boolean;
  createdAt: string;
}

/** `GET /api/study/exam-plan` — 활성 시험 목표 기준 하루 추천 학습량 + AI 설명 코멘트. */
export type ExamPlanResponse =
  | {
      status: "ok";
      activeGoal: ExamGoalResponse;
      daysRemaining: number;
      plan: RecommendedPlan;
      /** AI 설명 생성에 실패해도 수치 자체(plan)는 항상 반환하므로 null일 수 있다. */
      comment: string | null;
    }
  | {
      /** 모든 시험 목표가 지났거나(또는 아예 없어서) 추천할 활성 목표가 없는 상태. */
      status: "no_active_goal";
    };

import "server-only";

import { z } from "zod";

import { withAnalysisCache } from "@/lib/ai/cache";
import { runStructuredAnalysis } from "@/lib/ai/orchestrator";
import type { RecommendedPlan } from "@/lib/study/exam-plan";

export const EXAM_PLAN_ANALYSIS_TYPE = "exam_plan";

const COMMENT_MAX = 300;

export const examPlanExplanationSchema = z.object({
  comment: z.string().min(1).max(COMMENT_MAX),
});

export type ExamPlanExplanationResult = z.infer<typeof examPlanExplanationSchema>;

const SYSTEM_PROMPT = `당신은 일본어 학습 앱 kotoba-loop의 학습 계획 도우미입니다.
이미 규칙 기반으로 계산된 하루 추천 학습량(새 단어/복습/한자 개수, 문장 만들기 문제 수,
예상 소요 시간)을 사용자에게 자연스러운 한국어로 설명하는 코멘트를 작성하세요(계획서 52장
예시: "새 단어 12개, 복습 31개, 한자 5개, 문장 3문제, 예상 29분이면 목표일까지 준비할 수
있어요" 같은 형태).

규칙:
- 주어진 수치를 그대로 설명하는 역할만 하고, 수치 자체를 새로 계산하거나 바꾸지 마세요.
- 목표 급수와 시험까지 남은 기간을 언급하며 다정하게 동기를 북돋는 어투로 1~3문장 이내로
  작성하세요.
- 남은 기간이 며칠 안 되면 무리하지 않는 선에서 최선을 다하자는 어투로, 기간이 아주 길면
  (예: 1년 이상) 꾸준함을 강조하는 어투로 작성하세요.`;

function buildUserPrompt(params: {
  targetJlpt: string;
  daysRemaining: number;
  plan: RecommendedPlan;
}): string {
  const { targetJlpt, daysRemaining, plan } = params;
  return `목표: JLPT ${targetJlpt}, 시험까지 ${daysRemaining}일 남음.
추천 학습량: 새 단어 ${plan.newWordsPerDay}개, 복습 ${plan.reviewPerDay}개, 한자 ${plan.kanjiPerDay}개, 문장 만들기 ${plan.sentencePerDay}문제, 예상 소요 시간 약 ${plan.estimatedMinutes}분.

위 계획을 설명하는 코멘트를 작성해주세요.`;
}

export interface ExplainExamPlanResult {
  cached: boolean;
  result: ExamPlanExplanationResult;
}

/**
 * `inputRef`에 "examGoalId:날짜 키"를 넘겨, 목표를 전환하거나 날짜가 바뀌면 자연히
 * 새로 생성되는 캐시 정책을 만든다(analyzeWeakness와 동일한 재사용 패턴).
 */
export async function explainExamPlan(
  userId: string,
  examGoalId: string,
  dateKey: string,
  input: { targetJlpt: string; daysRemaining: number; plan: RecommendedPlan },
): Promise<ExplainExamPlanResult> {
  const { data, cached } = await withAnalysisCache({
    userId,
    analysisType: EXAM_PLAN_ANALYSIS_TYPE,
    inputRef: `${examGoalId}:${dateKey}`,
    run: async () => {
      const { data } = await runStructuredAnalysis({
        analysisType: EXAM_PLAN_ANALYSIS_TYPE,
        system: SYSTEM_PROMPT,
        user: buildUserPrompt(input),
        schema: examPlanExplanationSchema,
      });
      return data;
    },
  });

  return { cached, result: data };
}

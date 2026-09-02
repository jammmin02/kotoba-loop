import "server-only";

import { z } from "zod";

import { withAnalysisCache } from "@/lib/ai/cache";
import { runStructuredAnalysis } from "@/lib/ai/orchestrator";
import { QUIZ_TYPE_LABELS } from "@/lib/quiz/types";
import { MIN_REVIEWS_PER_TYPE_FOR_WEAKNESS } from "@/lib/study/weakness";
import type { QuizTypeAccuracy } from "@/lib/study/weakness";

export const WEAKNESS_ANALYSIS_TYPE = "weakness";

const COMMENT_MAX = 300;

export const weaknessAnalysisSchema = z.object({
  comment: z.string().min(1).max(COMMENT_MAX),
});

export type WeaknessAnalysisResult = z.infer<typeof weaknessAnalysisSchema>;

const SYSTEM_PROMPT = `당신은 일본어 학습 앱 kotoba-loop의 학습 분석 도우미입니다.
사용자의 문제 유형별 정답률 데이터를 보고, 상대적으로 약한 학습 패턴을 짚어주는 코멘트를
한국어로 작성하세요(계획서 35장 예시: "한국어를 보고 일본어를 떠올리는 능력이 상대적으로
약합니다").

규칙:
- 반드시 주어진 정답률 수치에 근거해서만 작성하세요. 주어지지 않은 정보를 지어내지 마세요.
- 여러 유형 중 정답률이 상대적으로 낮은 유형을 1~2개 짚어 설명하세요.
- 통계 화면에 함께 표시되는 도움말 카드용 코멘트이므로, 평가하거나 지적하는 어투가 아니라
  다정하게 조언하는 어투로 1~3문장 이내로 작성하세요.
- 모든 유형의 정답률이 비슷하고 고르게 높다면, 약점을 억지로 만들어내지 말고 전반적으로
  균형 있게 잘하고 있다는 긍정적인 코멘트를 작성하세요.`;

function buildUserPrompt(accuracyByType: QuizTypeAccuracy[]): string {
  const lines = accuracyByType
    .filter((row) => row.total >= MIN_REVIEWS_PER_TYPE_FOR_WEAKNESS)
    .map(
      (row) =>
        `- ${QUIZ_TYPE_LABELS[row.quizType]}: 정답률 ${row.accuracy}% (${row.total}문제 중 ${row.correct}개 정답)`,
    )
    .join("\n");

  return `다음은 사용자의 문제 유형별 정답률 데이터입니다.\n${lines}\n\n위 데이터에 근거해 학습 패턴 코멘트를 작성해주세요.`;
}

export interface AnalyzeWeaknessResult {
  cached: boolean;
  result: WeaknessAnalysisResult;
}

/**
 * `inputRef`에 KST 기준 날짜 키(`toKstDateKey`)를 넘기면, `AIAnalysis`의
 * `(user_id, analysis_type, input_ref)` 유니크 키가 날짜별로 바뀌어 자연히 "하루 1회 갱신"
 * 캐시 정책이 된다 — 스키마에 별도 TTL/만료 필드를 추가하지 않고 기존 캐시 메커니즘만 재사용.
 */
export async function analyzeWeakness(
  userId: string,
  accuracyByType: QuizTypeAccuracy[],
  dateKey: string,
): Promise<AnalyzeWeaknessResult> {
  const { data, cached } = await withAnalysisCache({
    userId,
    analysisType: WEAKNESS_ANALYSIS_TYPE,
    inputRef: dateKey,
    run: async () => {
      const { data } = await runStructuredAnalysis({
        analysisType: WEAKNESS_ANALYSIS_TYPE,
        system: SYSTEM_PROMPT,
        user: buildUserPrompt(accuracyByType),
        schema: weaknessAnalysisSchema,
      });
      return data;
    },
  });

  return { cached, result: data };
}

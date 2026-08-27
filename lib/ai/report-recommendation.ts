import "server-only";

import { z } from "zod";

import { runStructuredAnalysis } from "@/lib/ai/orchestrator";
import { QUIZ_TYPE_LABELS } from "@/lib/quiz/types";
import type { ReportKind } from "@/lib/study/report";
import type { ReportStats } from "@/lib/study/report-stats";
import { MIN_REVIEWS_PER_TYPE_FOR_WEAKNESS } from "@/lib/study/weakness";
import type { QuizTypeAccuracy } from "@/lib/study/weakness";

/** 프롬프트 구성에 필요한 최소 필드만 받는다(취약 한자 API 응답 형태에 결합되지 않도록). */
export interface WeakKanjiPromptItem {
  character: string;
  wrongRate: number;
}

export const REPORT_RECOMMENDATION_ANALYSIS_TYPE = "report_recommendation";

const COMMENT_MAX = 300;

export const reportRecommendationSchema = z.object({
  comment: z.string().min(1).max(COMMENT_MAX),
});

export type ReportRecommendationResult = z.infer<typeof reportRecommendationSchema>;

const SYSTEM_PROMPT = `당신은 일본어 학습 앱 kotoba-loop의 학습 분석 도우미입니다.
사용자의 주간/월간 학습 리포트 수치를 보고, 다음 기간(다음 주 또는 다음 달) 학습 방향을
한국어로 조언하는 코멘트를 작성하세요(계획서 53장 리포트, PROMPT 44).

규칙:
- 반드시 주어진 수치(학습 시간/새 단어 수/복습 수/새 한자 수/정답률/취약 유형/취약 한자)에
  근거해서만 작성하세요. 주어지지 않은 정보를 지어내지 마세요.
- 이번 기간 잘한 점을 먼저 짚고, 취약 유형/취약 한자가 있다면 다음 기간에 집중할 부분을
  구체적으로 제안하세요. 취약 데이터가 없다면 억지로 약점을 만들어내지 말고 꾸준함을
  격려하는 코멘트를 작성하세요.
- 평가하거나 지적하는 어투가 아니라 다정하게 조언하는 어투로 2~4문장 이내로 작성하세요.`;

function buildUserPrompt(
  kind: ReportKind,
  periodLabel: string,
  stats: ReportStats,
  accuracyByType: QuizTypeAccuracy[],
  weakKanji: WeakKanjiPromptItem[],
): string {
  const periodWord = kind === "week" ? "다음 주" : "다음 달";

  const weaknessLines = accuracyByType
    .filter((row) => row.total >= MIN_REVIEWS_PER_TYPE_FOR_WEAKNESS)
    .map((row) => `- ${QUIZ_TYPE_LABELS[row.quizType]}: 정답률 ${row.accuracy}%`)
    .join("\n");

  const weakKanjiLine =
    weakKanji.length > 0
      ? `취약 한자(최근 반복 오답): ${weakKanji.map((k) => `${k.character}(오답률 ${k.wrongRate}%)`).join(", ")}`
      : "취약 한자: 없음";

  return `다음은 사용자의 ${periodLabel} 학습 리포트 수치입니다.
- 학습 시간(추정): 약 ${stats.studyMinutes}분
- 새로 등록한 단어: ${stats.newWordCount}개
- 복습(학습 활동) 건수: ${stats.reviewCount}건
- 새로 학습을 시작한 한자: ${stats.newKanjiCount}자
- 전체 정답률: ${stats.accuracyRate}%

문제 유형별 정답률(데이터 충분한 유형만):
${weaknessLines || "- 데이터 부족으로 유형별 비교 불가"}

${weakKanjiLine}

위 수치에 근거해 ${periodWord} 학습 방향을 추천하는 코멘트를 작성해주세요.`;
}

export async function analyzeReportRecommendation(
  kind: ReportKind,
  periodLabel: string,
  stats: ReportStats,
  accuracyByType: QuizTypeAccuracy[],
  weakKanji: WeakKanjiPromptItem[],
): Promise<ReportRecommendationResult> {
  const { data } = await runStructuredAnalysis({
    analysisType: REPORT_RECOMMENDATION_ANALYSIS_TYPE,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(kind, periodLabel, stats, accuracyByType, weakKanji),
    schema: reportRecommendationSchema,
  });

  return data;
}

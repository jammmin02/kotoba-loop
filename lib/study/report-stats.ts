import "server-only";

import { db } from "@/lib/db";
import type { ReportPeriod } from "@/lib/study/report";
import { estimateStudyMinutes } from "@/lib/study/today-summary";

export interface ReportStats {
  /** lib/study/today-summary.ts의 "학습 건수 × 단어당 평균 시간" 추정 방식을 그대로 재사용한다. */
  studyMinutes: number;
  newWordCount: number;
  reviewCount: number;
  newKanjiCount: number;
  /** 0~100 정수(백분율). */
  accuracyRate: number;
}

/**
 * 기간 내 학습 수치를 집계한다. "새 단어/한자 수"는 UserVocabulary/UserKanji.created_at
 * (PROMPT 44에서 신설)을, "복습 수"/"전체 정답률"은 기존 통계(PROMPT 22)와 동일하게
 * ReviewHistory를 구간으로 필터링해 집계한다.
 */
export async function getReportStats(userId: string, period: ReportPeriod): Promise<ReportStats> {
  const { start, end } = period;

  const [reviewCount, correctCount, newWordCount, newKanjiCount] = await Promise.all([
    db.reviewHistory.count({ where: { user_id: userId, reviewed_at: { gte: start, lt: end } } }),
    db.reviewHistory.count({
      where: { user_id: userId, reviewed_at: { gte: start, lt: end }, result: true },
    }),
    db.userVocabulary.count({ where: { user_id: userId, created_at: { gte: start, lt: end } } }),
    db.userKanji.count({ where: { user_id: userId, created_at: { gte: start, lt: end } } }),
  ]);

  return {
    studyMinutes: estimateStudyMinutes(reviewCount),
    newWordCount,
    reviewCount,
    newKanjiCount,
    accuracyRate: reviewCount === 0 ? 0 : Math.round((correctCount / reviewCount) * 100),
  };
}

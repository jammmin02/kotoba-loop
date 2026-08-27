import type { ReportKind } from "@/lib/study/report";
import type { ReportStats } from "@/lib/study/report-stats";
import type { WordStatusCounts, StudyPeriodCounts } from "@/lib/study/stats";
import type { QuizTypeAccuracy } from "@/lib/study/weakness";

export interface StatsSummaryResponse {
  words: WordStatusCounts;
  studyCounts: StudyPeriodCounts;
}

export interface WeaknessAnalysisResponse {
  accuracyByType: QuizTypeAccuracy[];
  /** false면 AI 코멘트를 생성하기에 데이터가 부족하다 — `comment`는 항상 null. */
  hasEnoughData: boolean;
  /** `hasEnoughData`가 true인데도 null이면 AI 호출이 실패했다는 뜻(폴백 표시용). */
  comment: string | null;
}

export interface ReportPeriodInfo {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
}

/** 취약 한자(PROMPT 40) 리포트 표시용 — kanjiId 집계에 문자/뜻을 보강한 형태. */
export interface ReportWeakKanjiItem {
  kanjiId: string;
  character: string;
  meaning: string;
  recentCount: number;
  recentWrongCount: number;
  wrongRate: number;
}

export interface StatsReportResponse {
  kind: ReportKind;
  period: ReportPeriodInfo;
  stats: ReportStats;
  weakness: {
    accuracyByType: QuizTypeAccuracy[];
    hasEnoughData: boolean;
  };
  weakKanji: ReportWeakKanjiItem[];
  /** false면 이 기간에 학습 활동이 전혀 없었다는 뜻(첫 주/첫 달 등) — AI 코멘트도 항상 null. */
  hasActivityData: boolean;
  comment: string | null;
}

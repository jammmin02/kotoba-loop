import { SECONDS_PER_WORD } from "@/lib/study/constants";

export const REVIEW_CATEGORY_KEYS = ["yesterday", "day3", "day7", "day14Plus"] as const;
export type ReviewCategoryKey = (typeof REVIEW_CATEGORY_KEYS)[number];

export const TODAY_SUMMARY_CATEGORY_KEYS = ["newWords", ...REVIEW_CATEGORY_KEYS, "weak"] as const;
export type TodaySummaryCategoryKey = (typeof TODAY_SUMMARY_CATEGORY_KEYS)[number];

export const TODAY_SUMMARY_CATEGORY_LABELS: Record<TodaySummaryCategoryKey, string> = {
  newWords: "새 단어",
  yesterday: "어제 복습",
  day3: "3일 복습",
  day7: "7일 복습",
  day14Plus: "14일 복습",
  weak: "오답 복습",
};

/**
 * `interval_stage`는 다음 복습까지의 간격을 이미 반영해 갱신된 값이라, HARD/EASY 평가가 섞이면
 * "이 항목이 몇 일 전에 예정됐는지"를 저장값만으로 정확히 역산할 수 없다(추가 결정 필요 항목).
 * 표시 목적의 근사 분류로, 현재 stage를 REVIEW_INTERVALS_DAYS 인덱스에 그대로 대응시키고
 * 14/30/60/90일 간격(stage 3 이상)은 "14일 복습" 한 칸으로 묶는다(이 문서에서 확정).
 */
export function categorizeReviewStage(intervalStage: number): ReviewCategoryKey {
  if (intervalStage <= 0) return "yesterday";
  if (intervalStage === 1) return "day3";
  if (intervalStage === 2) return "day7";
  return "day14Plus";
}

/** `총 단어 수 × 단어당 평균 시간`을 분 단위로 반올림한다. 0개면 0분. */
export function estimateStudyMinutes(totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.max(1, Math.round((totalCount * SECONDS_PER_WORD) / 60));
}

/** 계획서 13장 예시("약 32분")와 동일한 형태의 라벨을 만든다. */
export function formatEstimatedTimeLabel(totalCount: number): string {
  const minutes = estimateStudyMinutes(totalCount);
  return minutes <= 0 ? "0분" : `약 ${minutes}분`;
}

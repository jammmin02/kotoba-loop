import { addKstDays } from "@/lib/datetime";
import {
  EASY_STAGE_SKIP,
  HARD_INTERVAL_DAYS,
  LEARNING_MAX_STAGE,
  MAX_STAGE,
  MIN_TOTAL_REVIEWS_FOR_WEAK_CHECK,
  REVIEW_INTERVALS_DAYS,
  UNKNOWN_INTERVAL_DAYS,
  WEAK_WRONG_RATE_THRESHOLD,
} from "@/lib/srs/constants";
import type { LearningStatus, ReviewGrade, SrsState, SrsUpdate } from "@/lib/srs/types";

/**
 * Pure SRS transition function (계획서 15~16장): given the current review state
 * and a grade, returns the next `UserVocabulary` fields. No I/O, no `Date.now()`
 * default reliance in tests — callers always pass `now` explicitly in specs and
 * the API route passes the request-time `Date`.
 */
/** GOOD/EASY는 정답, UNKNOWN/HARD는 오답으로 취급한다(ReviewHistory 기록 등 다른 곳에서도 재사용). */
export function isCorrectGrade(grade: ReviewGrade): boolean {
  return grade === "GOOD" || grade === "EASY";
}

/**
 * 평가 결과로 정해지는 다음 간격(일)과 단계. `applyReview`와 UI의 "다음 복습" 미리보기가 같은
 * 규칙을 쓰도록 한 곳에 둔다 — 간격 테이블을 바꾸면 두 곳이 함께 바뀐다.
 */
export function getNextInterval(
  intervalStage: number,
  grade: ReviewGrade,
): { intervalStage: number; intervalDays: number } {
  switch (grade) {
    case "UNKNOWN":
      return { intervalStage: 0, intervalDays: UNKNOWN_INTERVAL_DAYS };
    case "HARD":
      return { intervalStage, intervalDays: HARD_INTERVAL_DAYS };
    case "GOOD":
      return {
        intervalStage: Math.min(intervalStage + 1, MAX_STAGE),
        intervalDays: REVIEW_INTERVALS_DAYS[Math.min(intervalStage, MAX_STAGE)],
      };
    case "EASY":
      return {
        intervalStage: Math.min(intervalStage + EASY_STAGE_SKIP, MAX_STAGE),
        intervalDays: REVIEW_INTERVALS_DAYS[Math.min(intervalStage + 1, MAX_STAGE)],
      };
  }
}

export function applyReview(state: SrsState, grade: ReviewGrade, now: Date): SrsUpdate {
  const isCorrect = isCorrectGrade(grade);
  const correctCount = state.correctCount + (isCorrect ? 1 : 0);
  const wrongCount = state.wrongCount + (isCorrect ? 0 : 1);

  // "최고 간격(90일) 통과 시 MASTERED": 이번 리뷰에 들어오기 전에 이미 최고
  // 단계까지 올라와 있었고(=90일 간격이 배정된 상태), 이번에도 정답을 맞혔다는 뜻.
  const wasAtMaxStage = state.intervalStage >= MAX_STAGE;

  const { intervalStage, intervalDays } = getNextInterval(state.intervalStage, grade);

  const nextReviewAt = addKstDays(now, intervalDays);

  const totalReviews = correctCount + wrongCount;
  const wrongRate = totalReviews === 0 ? 0 : wrongCount / totalReviews;

  let learningStatus: LearningStatus;
  if (isCorrect && wasAtMaxStage) {
    learningStatus = "MASTERED";
  } else if (
    totalReviews >= MIN_TOTAL_REVIEWS_FOR_WEAK_CHECK &&
    wrongRate >= WEAK_WRONG_RATE_THRESHOLD
  ) {
    learningStatus = "WEAK";
  } else {
    learningStatus = intervalStage <= LEARNING_MAX_STAGE ? "LEARNING" : "REVIEW";
  }

  return { intervalStage, learningStatus, correctCount, wrongCount, nextReviewAt };
}

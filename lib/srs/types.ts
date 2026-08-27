export const REVIEW_GRADES = ["UNKNOWN", "HARD", "GOOD", "EASY"] as const;

export type ReviewGrade = (typeof REVIEW_GRADES)[number];

/** Mirrors the Prisma `LearningStatus` enum without importing the generated client into pure logic. */
export type LearningStatus = "NEW" | "LEARNING" | "REVIEW" | "WEAK" | "MASTERED";

export interface SrsState {
  intervalStage: number;
  learningStatus: LearningStatus;
  correctCount: number;
  wrongCount: number;
}

export interface SrsUpdate {
  intervalStage: number;
  learningStatus: LearningStatus;
  correctCount: number;
  wrongCount: number;
  nextReviewAt: Date;
}

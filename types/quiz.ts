import type { QuizQuestion, QuizType } from "@/lib/quiz/types";
import type { LearningStatus } from "@/lib/srs/types";
import type { GameProfileGain } from "@/types/game";

export interface QuizSessionResponse {
  questions: QuizQuestion[];
  /** 정답률 기반으로 비중을 높인 유형(PROMPT 39) — 가중치를 적용하지 않았으면(데이터 부족 등) null. */
  boostedType: QuizType | null;
}

export interface QuizSubmitResponse {
  isCorrect: boolean;
  learningStatus: LearningStatus;
  nextReviewAt: string;
  gameProfile: GameProfileGain;
}

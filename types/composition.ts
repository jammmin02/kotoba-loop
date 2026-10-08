import type { CompositionFeedbackItem } from "@/lib/ai/composition";

export interface CompositionAttemptView {
  id: string;
  order: number;
  promptKorean: string;
  answerJapanese: string;
  score: number;
  grammarScore: number;
  vocabularyScore: number;
  naturalnessScore: number;
  isAccepted: boolean;
  feedback: {
    items: CompositionFeedbackItem[];
    modelAnswers: string[];
    comment: string;
  };
}

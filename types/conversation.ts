import type { CompositionFeedbackItem, CompositionHint } from "@/lib/ai/composition";
import type { CompositionSummary } from "@/lib/composition/config";

export interface ConversationGradeView {
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

export interface ConversationMessageView {
  id: string;
  seq: number;
  role: "AI" | "USER";
  text: string;
  /** AI 발화의 한국어 번역. */
  textKo: string | null;
  /** AI 발화에 붙은 "다음 답변용" 힌트. */
  hints: CompositionHint[];
  hintUsed: boolean;
  /** 학습자 발화에만 있다. */
  grade: ConversationGradeView | null;
}

export interface ConversationSessionView {
  id: string;
  scenario: string;
  topic: string;
  vocabLevel: string;
  tone: string;
  targetTurns: number;
  createdAt: string;
  finishedAt: string | null;
  summaryComment: string | null;
  summaryFocus: string | null;
}

export interface ConversationSessionDetail {
  session: ConversationSessionView;
  messages: ConversationMessageView[];
  summary: CompositionSummary;
}

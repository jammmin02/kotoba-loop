"use client";

import { create } from "zustand";

import { MAX_SESSION_REQUEUE_PER_QUESTION } from "@/lib/quiz/constants";
import type { QuizQuestion } from "@/lib/quiz/types";

export interface QuizFeedback {
  isCorrect: boolean;
}

interface QuizSessionState {
  questions: QuizQuestion[];
  currentIndex: number;
  feedback: QuizFeedback | null;
  correctCount: number;
  wrongCount: number;
  /** 세션 중 한 번이라도 오답을 낸 대상 id(교정 여부와 무관) — 종료 화면의 "틀린 것만 다시 풀기"용. */
  missedTargetIds: string[];
  requeueCounts: Record<string, number>;
  startSession: (questions: QuizQuestion[]) => void;
  recordAnswer: (question: QuizQuestion, isCorrect: boolean) => void;
  advance: () => void;
}

/**
 * PROMPT 18 `useStudySessionStore`와 같은 이유로 persist 미들웨어를 쓰지 않는다: 새로고침하면
 * `/api/quiz/session`을 다시 호출하고, 이미 채점된 단어는 SRS 갱신으로 `next_review_at`이
 * 밀려 오늘 큐에서 자연히 빠지므로 클라이언트가 진행 상태를 따로 보존할 필요가 없다.
 */
export const useQuizSessionStore = create<QuizSessionState>()((set) => ({
  questions: [],
  currentIndex: 0,
  feedback: null,
  correctCount: 0,
  wrongCount: 0,
  missedTargetIds: [],
  requeueCounts: {},
  startSession: (questions) =>
    set({
      questions,
      currentIndex: 0,
      feedback: null,
      correctCount: 0,
      wrongCount: 0,
      missedTargetIds: [],
      requeueCounts: {},
    }),
  recordAnswer: (question, isCorrect) =>
    set((state) => {
      if (isCorrect) {
        return {
          feedback: { isCorrect },
          correctCount: state.correctCount + 1,
        };
      }

      const missedTargetIds = state.missedTargetIds.includes(question.targetId)
        ? state.missedTargetIds
        : [...state.missedTargetIds, question.targetId];

      const requeueCount = state.requeueCounts[question.targetId] ?? 0;
      const canRequeue = requeueCount < MAX_SESSION_REQUEUE_PER_QUESTION;

      return {
        feedback: { isCorrect },
        wrongCount: state.wrongCount + 1,
        missedTargetIds,
        questions: canRequeue ? [...state.questions, question] : state.questions,
        requeueCounts: canRequeue
          ? { ...state.requeueCounts, [question.targetId]: requeueCount + 1 }
          : state.requeueCounts,
      };
    }),
  advance: () => set((state) => ({ currentIndex: state.currentIndex + 1, feedback: null })),
}));

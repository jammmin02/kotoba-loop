"use client";

import { create } from "zustand";

import { MAX_SESSION_REQUEUE_PER_QUESTION } from "@/lib/quiz/constants";
import type { QuizQuestion } from "@/lib/quiz/types";
import type { QuizSnapshot } from "@/lib/study/saved-session";

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
  /** 저장해 둔 진행 상황으로 세션을 되살린다(이어서 하기). */
  restoreSession: (snapshot: QuizSnapshot) => void;
}

/**
 * PROMPT 18 `useStudySessionStore`와 같은 이유로 persist 미들웨어를 쓰지 않는다. 이어서 하기는
 * QuizSession이 `lib/study/saved-session`에 명시적으로 저장/복원한다(세션마다 key와 7일 만료가 필요).
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
  restoreSession: (snapshot) =>
    set({
      questions: snapshot.questions,
      currentIndex: snapshot.currentIndex,
      feedback: null,
      correctCount: snapshot.correctCount,
      wrongCount: snapshot.wrongCount,
      missedTargetIds: snapshot.missedTargetIds,
      requeueCounts: snapshot.requeueCounts,
    }),
}));

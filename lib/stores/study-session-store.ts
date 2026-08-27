"use client";

import { create } from "zustand";

import type { ReviewGrade } from "@/lib/srs/types";
import { MAX_SESSION_REQUEUE_PER_CARD } from "@/lib/study/constants";
import type { SessionCard } from "@/types/study";

export type StudySessionMode = "today" | "tag" | "custom";

type GradeTally = Record<ReviewGrade, number>;

const EMPTY_TALLY: GradeTally = { UNKNOWN: 0, HARD: 0, GOOD: 0, EASY: 0 };

interface StudySessionState {
  mode: StudySessionMode | null;
  tagName?: string;
  queue: SessionCard[];
  currentIndex: number;
  isFlipped: boolean;
  isSubmitting: boolean;
  tally: GradeTally;
  /** 세션 중 한 번이라도 "모르겠음/헷갈림"을 받은 단어 id(이후 교정 여부와 무관) —
   * 종료 화면의 "틀린 것만 다시 풀기"용. */
  missedVocabularyIds: string[];
  requeueCounts: Record<string, number>;
  startSession: (mode: StudySessionMode, queue: SessionCard[], tagName?: string) => void;
  flip: () => void;
  setSubmitting: (value: boolean) => void;
  recordGrade: (grade: ReviewGrade) => void;
}

/**
 * 의도적으로 persist 미들웨어를 쓰지 않는다(PROMPT 18 "추가 결정 필요" 항목 확정값):
 * 새로고침 시 메모리 상태가 사라지고 세션 페이지가 서버에서 큐를 다시 조회하므로,
 * 이미 채점된 카드는 자연히 빠진 "갱신된 오늘의 큐"로 다시 시작하게 된다.
 */
export const useStudySessionStore = create<StudySessionState>()((set) => ({
  mode: null,
  tagName: undefined,
  queue: [],
  currentIndex: 0,
  isFlipped: false,
  isSubmitting: false,
  tally: EMPTY_TALLY,
  missedVocabularyIds: [],
  requeueCounts: {},
  startSession: (mode, queue, tagName) =>
    set({
      mode,
      queue,
      tagName,
      currentIndex: 0,
      isFlipped: false,
      isSubmitting: false,
      tally: { ...EMPTY_TALLY },
      missedVocabularyIds: [],
      requeueCounts: {},
    }),
  flip: () => set((state) => ({ isFlipped: !state.isFlipped })),
  setSubmitting: (value) => set({ isSubmitting: value }),
  recordGrade: (grade) =>
    set((state) => {
      const card = state.queue[state.currentIndex];
      const isMissed = grade === "UNKNOWN" || grade === "HARD";

      let queue = state.queue;
      let missedVocabularyIds = state.missedVocabularyIds;
      let requeueCounts = state.requeueCounts;

      if (card && isMissed) {
        missedVocabularyIds = missedVocabularyIds.includes(card.vocabularyId)
          ? missedVocabularyIds
          : [...missedVocabularyIds, card.vocabularyId];

        const requeueCount = state.requeueCounts[card.vocabularyId] ?? 0;
        if (requeueCount < MAX_SESSION_REQUEUE_PER_CARD) {
          queue = [...state.queue, card];
          requeueCounts = { ...state.requeueCounts, [card.vocabularyId]: requeueCount + 1 };
        }
      }

      return {
        queue,
        missedVocabularyIds,
        requeueCounts,
        currentIndex: state.currentIndex + 1,
        isFlipped: false,
        isSubmitting: false,
        tally: { ...state.tally, [grade]: state.tally[grade] + 1 },
      };
    }),
}));

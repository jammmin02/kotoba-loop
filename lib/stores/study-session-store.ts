"use client";

import { create } from "zustand";

import type { ReviewGrade } from "@/lib/srs/types";
import { MAX_SESSION_REQUEUE_PER_CARD } from "@/lib/study/constants";
import type { FlashcardSnapshot } from "@/lib/study/saved-session";
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
  /**
   * `nextIntervalStage`는 서버가 채점 후 돌려준 새 SRS 단계 — 같은 세션에서 다시 나오는 카드
   * (모르겠음/헷갈림 재출제)의 "다음 복습" 미리보기가 채점 전 단계를 기준으로 하지 않게 한다.
   */
  recordGrade: (grade: ReviewGrade, nextIntervalStage?: number) => void;
  /** 저장해 둔 진행 상황으로 세션을 되살린다(이어서 하기). */
  restoreSession: (snapshot: FlashcardSnapshot) => void;
}

/**
 * 의도적으로 persist 미들웨어를 쓰지 않는다(PROMPT 18 "추가 결정 필요" 항목 확정값).
 * 이어서 하기는 FlashcardSession이 `lib/study/saved-session`에 명시적으로 저장/복원한다
 * (세션마다 key와 7일 만료가 필요해 스토어 전체를 통째로 persist하는 것과 맞지 않는다).
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
  restoreSession: (snapshot) =>
    set({
      mode: snapshot.mode,
      tagName: snapshot.tagName,
      queue: snapshot.queue,
      currentIndex: snapshot.currentIndex,
      isFlipped: false,
      isSubmitting: false,
      tally: { ...snapshot.tally },
      missedVocabularyIds: snapshot.missedVocabularyIds,
      requeueCounts: snapshot.requeueCounts,
    }),
  flip: () => set((state) => ({ isFlipped: !state.isFlipped })),
  setSubmitting: (value) => set({ isSubmitting: value }),
  recordGrade: (grade, nextIntervalStage) =>
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
          queue = [
            ...state.queue,
            nextIntervalStage === undefined ? card : { ...card, intervalStage: nextIntervalStage },
          ];
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

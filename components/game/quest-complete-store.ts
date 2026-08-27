"use client";

import { create } from "zustand";

/** globals.css의 `--animate-quest-complete`(500ms)보다 살짝 여유를 둔 표시 시간. */
export const QUEST_COMPLETE_GLOW_DISPLAY_MS = 700;

interface QuestCompleteState {
  pendingCodes: string[];
}

/**
 * `level-up-store.ts`와 같은 이유로 같은 패턴을 쓴다 — 퀘스트 완료가 학습 세션 페이지
 * (Quest Card가 없는 화면)에서 발생해도, 홈으로 돌아와 카드가 실제로 마운트되는 순간
 * 체크 애니메이션이 확실히 재생되도록 "완료됨" 사실 자체를 잠깐 들고 있는다.
 */
const useQuestCompleteStore = create<QuestCompleteState>()(() => ({ pendingCodes: [] }));

export const questCompleteGlow = {
  markPending: (codes: string[]) => {
    if (codes.length === 0) return;
    useQuestCompleteStore.setState((state) => ({
      pendingCodes: [...new Set([...state.pendingCodes, ...codes])],
    }));
  },
};

export function useQuestCompletePending(): [string[], (code: string) => void] {
  const pendingCodes = useQuestCompleteStore((state) => state.pendingCodes);
  const clearPending = (code: string) =>
    useQuestCompleteStore.setState((state) => ({
      pendingCodes: state.pendingCodes.filter((pendingCode) => pendingCode !== code),
    }));
  return [pendingCodes, clearPending];
}

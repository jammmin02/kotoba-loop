"use client";

import { create } from "zustand";

export type PetMotionEvent = "happy" | "sparkle";

export const PET_MOTION_DISPLAY_MS: Record<PetMotionEvent, number> = {
  happy: 500,
  sparkle: 1800,
};

interface PetMotionState {
  pending: PetMotionEvent | null;
}

/**
 * `level-up-store.ts`와 같은 zustand "pending 1개, 다음 마운트 시 1회 재생" 패턴. 값이 2종이라
 * 우선순위가 있다 — sparkle(성장/졸업)이 이미 대기 중이면 happy(퀴즈 정답)로 덮어쓰지 않는다.
 * 레벨업과 퀴즈 정답이 같은 응답에서 동시에 발생해도(모션 트리거가 겹치는 테스트 케이스) 더
 * 중요한 성장 이벤트가 항상 이긴다.
 */
const usePetMotionStore = create<PetMotionState>()(() => ({ pending: null }));

export const petMotion = {
  markPending: (event: PetMotionEvent) => {
    const current = usePetMotionStore.getState().pending;
    if (current === "sparkle" && event === "happy") return;
    usePetMotionStore.setState({ pending: event });
  },
};

export function usePetMotionPending(): [PetMotionEvent | null, () => void] {
  const pending = usePetMotionStore((state) => state.pending);
  const clearPending = () => usePetMotionStore.setState({ pending: null });
  return [pending, clearPending];
}

"use client";

import { create } from "zustand";

export const LEVEL_UP_GLOW_DISPLAY_MS = 1800;

interface LevelUpState {
  pending: boolean;
}

/**
 * `exp-toast.tsx`와 같은 zustand-임퍼러티브 패턴이지만, 시간 기반 자동 소멸이 아니라
 * "다음에 Level Badge가 실제로 보일 때" 1회성으로 재생되도록 `pending` 플래그만 들고 있는다.
 * 레벨업이 학습 세션 페이지(Level Badge가 없는 화면)에서 발생해도, 홈으로 돌아와 배지가
 * 마운트되는 순간 확실히 glow가 재생된다 — `clearPending`은 그 마운트 쪽에서 호출한다.
 */
const useLevelUpStore = create<LevelUpState>()(() => ({ pending: false }));

export const levelUpGlow = {
  markPending: () => useLevelUpStore.setState({ pending: true }),
};

export function useLevelUpPending(): [boolean, () => void] {
  const pending = useLevelUpStore((state) => state.pending);
  const clearPending = () => useLevelUpStore.setState({ pending: false });
  return [pending, clearPending];
}

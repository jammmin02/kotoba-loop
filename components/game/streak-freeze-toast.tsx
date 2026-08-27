"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";

/** exp-toast.tsx와 같은 zustand-임퍼러티브 패턴(PROMPT 27.5). 이 토스트는 EXP 지급 응답이
 * 아니라 GET /api/game/profile의 `streakFreezeJustConsumed` 플래그로만 트리거된다 — 자동
 * 소비는 학습 액션 도중 조용히 일어나므로, 사용자가 다음에 프로필을 조회하는 순간에야
 * "어제는 못했지만 지켰다"는 사실을 알려줄 수 있다. */
const DISPLAY_DURATION_MS = 2200;

interface StreakFreezeToastState {
  items: { id: string }[];
  show: () => void;
}

const useStreakFreezeToastStore = create<StreakFreezeToastState>()((set) => ({
  items: [],
  show: () => {
    const id = crypto.randomUUID();
    set((state) => ({ items: [...state.items, { id }] }));
    setTimeout(() => {
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    }, DISPLAY_DURATION_MS);
  },
}));

export const streakFreezeToast = {
  show: () => useStreakFreezeToastStore.getState().show(),
};

/** 프로필 응답의 `streakFreezeJustConsumed`가 true로 바뀌는 순간에만 토스트를 1회 띄운다.
 * 서버가 응답을 내려주며 그 즉시 플래그를 false로 되돌리므로(app/api/game/profile/route.ts),
 * 이후 같은 쿼리를 다시 조회해도 다시 true가 내려오지 않는다 — 별도의 클라이언트 측 dedup이
 * 필요 없다. GameProfileHeader/StreakCalendarView처럼 프로필을 조회하는 컴포넌트에서 호출한다. */
export function useStreakFreezeNotice(justConsumed: boolean | undefined): void {
  useEffect(() => {
    if (justConsumed) streakFreezeToast.show();
  }, [justConsumed]);
}

function subscribeNoop() {
  return () => {};
}

function useMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

export function StreakFreezeToastViewport() {
  const items = useStreakFreezeToastStore((state) => state.items);
  const mounted = useMounted();

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-28 z-50 flex flex-col items-center gap-2">
      {items.map((item) => (
        <span
          key={item.id}
          role="status"
          aria-live="polite"
          className="animate-exp-toast flex items-center gap-2 rounded-none border-2 border-pixel-ink bg-surface px-3 py-1.5 text-sm font-extrabold text-foreground shadow-pixel-sm"
        >
          ❄️ 어제는 못했지만 스트릭 프리즈로 지켰어요!
        </span>
      ))}
    </div>,
    document.body,
  );
}

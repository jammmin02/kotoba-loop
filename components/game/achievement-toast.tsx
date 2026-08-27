"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";

import { PixelStar } from "@/components/icons/pixel-icons";

interface AchievementToastItem {
  id: string;
  title: string;
}

interface AchievementToastState {
  items: AchievementToastItem[];
  show: (title: string) => void;
}

/** exp-toast.tsx의 DISPLAY_DURATION_MS보다 살짝 길게 둬서 "업적 달성"이라는 문구까지
 * 읽을 시간을 준다. */
const DISPLAY_DURATION_MS = 2200;

const useAchievementToastStore = create<AchievementToastState>()((set) => ({
  items: [],
  show: (title) => {
    const id = crypto.randomUUID();
    set((state) => ({ items: [...state.items, { id, title }] }));
    setTimeout(() => {
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    }, DISPLAY_DURATION_MS);
  },
}));

/** Imperative trigger for a brief achievement-unlock toast — call once per unlocked achievement. */
export const achievementToast = {
  show: (title: string) => useAchievementToastStore.getState().show(title),
};

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

export function AchievementToastViewport() {
  const items = useAchievementToastStore((state) => state.items);
  const mounted = useMounted();

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-28 z-50 flex flex-col items-center gap-2">
      {items.map((item) => (
        <span
          key={item.id}
          role="status"
          aria-live="polite"
          className="animate-exp-toast flex items-center gap-2 rounded-none border-2 border-pixel-ink bg-accent px-3 py-1.5 text-sm font-extrabold text-accent-foreground shadow-glow"
        >
          <PixelStar className="size-4 shrink-0" aria-hidden="true" />
          업적 달성: {item.title}
        </span>
      ))}
    </div>,
    document.body,
  );
}

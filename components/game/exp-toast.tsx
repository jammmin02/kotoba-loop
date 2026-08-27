"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";

interface ExpToastItem {
  id: string;
  amount: number;
}

interface ExpToastState {
  items: ExpToastItem[];
  show: (amount: number) => void;
}

const DISPLAY_DURATION_MS = 1500;

const useExpToastStore = create<ExpToastState>()((set) => ({
  items: [],
  show: (amount) => {
    const id = crypto.randomUUID();
    set((state) => ({ items: [...state.items, { id, amount }] }));
    setTimeout(() => {
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    }, DISPLAY_DURATION_MS);
  },
}));

/** Imperative trigger for a brief "+N EXP" toast — call from anywhere once EXP is awarded. */
export const expToast = {
  show: (amount: number) => useExpToastStore.getState().show(amount),
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

export function ExpToastViewport() {
  const items = useExpToastStore((state) => state.items);
  const mounted = useMounted();

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center gap-2">
      {items.map((item) => (
        <span
          key={item.id}
          role="status"
          aria-live="polite"
          className="animate-exp-toast rounded-none border-2 border-pixel-ink bg-accent px-3 py-1 text-sm font-extrabold text-accent-foreground shadow-glow"
        >
          +{item.amount} EXP
        </span>
      ))}
    </div>,
    document.body,
  );
}

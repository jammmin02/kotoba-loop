"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";

import { PixelCheck, PixelInfo, PixelX } from "@/components/icons/pixel-icons";
import type { PixelIconComponent } from "@/components/icons/pixel-icons";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, variant: ToastVariant) => void;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  show: (message, variant) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().show(message, "success"),
  error: (message: string) => useToastStore.getState().show(message, "error"),
  info: (message: string) => useToastStore.getState().show(message, "info"),
};

const variantIconBoxStyles: Record<ToastVariant, string> = {
  success: "bg-success text-success-foreground",
  error: "bg-error text-error-foreground",
  info: "bg-primary text-primary-foreground",
};

const variantIcons: Record<ToastVariant, PixelIconComponent> = {
  success: PixelCheck,
  error: PixelX,
  info: PixelInfo,
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

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const mounted = useMounted();

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end">
      {toasts.map((item) => {
        const Icon = variantIcons[item.variant];
        return (
          <div
            key={item.id}
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex w-full max-w-sm items-stretch border-2 border-pixel-ink bg-surface text-sm shadow-pixel"
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center px-2.5",
                variantIconBoxStyles[item.variant],
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="flex-1 py-3 pl-3 text-foreground">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="알림 닫기"
              className="px-2.5 text-foreground/50 transition hover:text-foreground"
            >
              <PixelX className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

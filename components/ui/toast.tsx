"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";

import { PixelCheck, PixelInfo, PixelX } from "@/components/icons/pixel-icons";
import type { PixelIconComponent } from "@/components/icons/pixel-icons";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

/** 토스트에 붙일 수 있는 보조 동작(예: 삭제 후 "실행 취소"). 누르면 실행하고 토스트를 닫는다. */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  action?: ToastAction;
  /** 자동으로 닫히기까지의 시간(ms). 생략하면 기본값. */
  durationMs?: number;
}

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
  durationMs: number;
}

interface ToastState {
  toasts: ToastItem[];
  /** 새 토스트의 id를 돌려준다 — 나중에 `toast.dismiss(id)`로 닫을 때 쓴다. */
  show: (message: string, variant: ToastVariant, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const DEFAULT_DURATION_MS = 4000;
/** 동시에 보여줄 최대 개수. 넘치면 가장 오래된 것부터 치운다(화면이 토스트로 덮이지 않게). */
const MAX_VISIBLE_TOASTS = 3;

// 자동 닫힘 타이머는 각 토스트 컴포넌트가 들고 있다(호버/포커스 중 일시정지해야 하므로).
const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  show: (message, variant, options) => {
    const item: ToastItem = {
      id: crypto.randomUUID(),
      message,
      variant,
      action: options?.action,
      durationMs: options?.durationMs ?? DEFAULT_DURATION_MS,
    };
    set((state) => ({ toasts: [...state.toasts, item].slice(-MAX_VISIBLE_TOASTS) }));
    return item.id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    useToastStore.getState().show(message, "success", options),
  error: (message: string, options?: ToastOptions) =>
    useToastStore.getState().show(message, "error", options),
  info: (message: string, options?: ToastOptions) =>
    useToastStore.getState().show(message, "info", options),
  /** 이미 사라졌거나 없는 id여도 아무 일도 일어나지 않는다. */
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
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

/**
 * 토스트 하나. 자동 닫힘 타이머를 직접 관리해, 마우스를 올리거나 키보드 포커스가 들어와 있는
 * 동안에는 멈추고 벗어나면 남은 시간만큼만 다시 센다(WCAG 2.2.1 — 읽을 시간 보장).
 */
function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const Icon = variantIcons[item.variant];
  const remainingRef = useRef(item.durationMs);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  const pause = () => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
  };

  const resume = () => {
    if (hoveredRef.current || focusedRef.current || timerRef.current !== null) return;
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => onDismissRef.current(item.id), remainingRef.current);
  };

  useEffect(() => {
    resume();
    return pause;
    // 마운트 때 한 번만 타이머를 시작한다 — 일시정지/재개는 아래 이벤트가 맡는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isError = item.variant === "error";

  return (
    <div
      // 오류는 즉시 읽어주고(alert), 나머지는 하던 안내를 끊지 않고 읽어준다(status).
      role={isError ? "alert" : "status"}
      onPointerEnter={() => {
        hoveredRef.current = true;
        pause();
      }}
      onPointerLeave={() => {
        hoveredRef.current = false;
        resume();
      }}
      onFocus={() => {
        focusedRef.current = true;
        pause();
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        focusedRef.current = false;
        resume();
      }}
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
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick();
            onDismiss(item.id);
          }}
          className="touch-target my-1.5 mr-1 shrink-0 self-center border-2 border-pixel-ink bg-surface px-2.5 py-1 text-xs font-bold text-foreground shadow-bevel-raised transition hover:bg-background active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="알림 닫기"
        className="flex min-w-11 items-center justify-center text-muted transition hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        <PixelX className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const mounted = useMounted();

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end lg:bottom-6">
      {toasts.map((item) => (
        <ToastView key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </div>,
    document.body,
  );
}

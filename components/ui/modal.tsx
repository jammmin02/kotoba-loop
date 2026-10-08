"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { PixelX } from "@/components/icons/pixel-icons";
import { FOCUSABLE_SELECTOR, getTabWrapTarget } from "@/lib/focus-trap";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

// 열려 있는 모달의 대화상자 요소(맨 뒤가 가장 위). 모달이 겹쳐 열려도 Esc/Tab 처리와 스크롤 잠금이
// 맨 위 모달 기준으로만 동작하게 한다.
const openDialogs: HTMLElement[] = [];
let savedBodyOverflow = "";

function getFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getClientRects().length > 0,
  );
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // onClose가 렌더마다 새 함수여도 효과가 다시 실행돼 포커스를 빼앗지 않도록 ref로 최신값만 들고 있는다.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    // 모달을 연 요소를 기억해 두었다가 닫을 때 돌려준다 — 안 그러면 키보드 사용자는 포커스를 잃는다.
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const isTopmost = () => openDialogs[openDialogs.length - 1] === dialog;

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialog || !isTopmost()) return;

      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      // 포커스가 대화상자 밖으로 빠져나가지 않게 끝에서 반대쪽 끝으로 돌린다.
      const focusable = getFocusableElements(dialog);
      const target = getTabWrapTarget(
        focusable.indexOf(document.activeElement as HTMLElement),
        focusable.length,
        event.shiftKey,
      );
      if (!target) return;
      event.preventDefault();
      if (target === "container") dialog.focus();
      else (target === "first" ? focusable[0] : focusable[focusable.length - 1]).focus();
    }

    // 마우스/스크립트로 포커스가 밖으로 나가도(예: 뒤쪽 페이지 클릭) 대화상자로 되돌린다.
    function handleFocusIn(event: FocusEvent) {
      if (!dialog || !isTopmost()) return;
      if (event.target instanceof Node && !dialog.contains(event.target)) dialog.focus();
    }

    if (openDialogs.length === 0) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openDialogs.push(dialog);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    dialog.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      openDialogs.splice(openDialogs.indexOf(dialog), 1);
      if (openDialogs.length === 0) document.body.style.overflow = savedBodyOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-pixel-ink/50" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "대화상자"}
        tabIndex={-1}
        className={cn(
          "relative z-10 max-h-[85dvh] w-full overflow-y-auto rounded-none border-2 border-pixel-ink bg-surface shadow-pixel-lg outline-none sm:max-w-md",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b-2 border-pixel-ink bg-primary px-3 py-1.5 text-primary-foreground">
          <h2 id={titleId} className="truncate text-sm font-bold">
            {title ?? "대화상자"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="touch-target flex size-5 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground shadow-bevel-raised transition active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
          >
            <PixelX className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

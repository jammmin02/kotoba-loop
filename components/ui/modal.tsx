"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { PixelX } from "@/components/icons/pixel-icons";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-pixel-ink/50" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "대화상자"}
        tabIndex={-1}
        className={cn(
          "relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-none border-2 border-pixel-ink bg-surface shadow-pixel-lg outline-none sm:max-w-md",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b-2 border-pixel-ink bg-primary px-3 py-1.5 text-primary-foreground">
          <h2 className="truncate text-sm font-bold">{title ?? "대화상자"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-5 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground shadow-bevel-raised transition active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
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

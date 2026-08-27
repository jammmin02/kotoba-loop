import { cn } from "@/lib/utils";

import type { ButtonHTMLAttributes } from "react";

export interface ChipButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
}

/** Toggleable pixel-shell chip used for single- and multi-select option groups. */
export function ChipButton({ selected, className, children, ...props }: ChipButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "border-2 border-pixel-ink px-3 py-2 text-sm font-bold transition",
        selected
          ? "bg-primary text-primary-foreground shadow-bevel-sunken"
          : "bg-surface text-foreground shadow-bevel-raised hover:bg-background",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

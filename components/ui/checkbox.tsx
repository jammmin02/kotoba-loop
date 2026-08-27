import { forwardRef } from "react";

import { PixelCheck } from "@/components/icons/pixel-icons";
import { cn } from "@/lib/utils";

import type { InputHTMLAttributes } from "react";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

/**
 * A real `<input type="checkbox">` (native keyboard/a11y semantics) visually replaced with a
 * pixel-bevel box, matching the rest of the design system's inputs (`shadow-bevel-sunken`)
 * instead of the browser default — the multi-select list checkbox the PROMPT 31 review screen
 * needs, which no existing primitive covers (`ChipButton` is a chip/pill toggle, not a row checkbox).
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, checked, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          "inline-flex items-center gap-2",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          className,
        )}
      >
        <span className="relative inline-flex size-6 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface shadow-bevel-sunken">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            {...props}
          />
          {checked && <PixelCheck className="size-4 text-primary" aria-hidden="true" />}
        </span>
        {label && <span className="text-sm font-bold text-foreground">{label}</span>}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";

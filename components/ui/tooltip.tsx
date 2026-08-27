"use client";

import { cloneElement, useId, useState } from "react";

import { cn } from "@/lib/utils";

import type { ReactElement } from "react";

export interface TooltipProps {
  content: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom";
  className?: string;
}

export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {cloneElement(children, { "aria-describedby": id })}
      <span
        role="tooltip"
        id={id}
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-none border-2 border-pixel-ink bg-surface px-2 py-1 text-xs font-bold text-foreground shadow-pixel-sm transition-opacity",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          visible ? "opacity-100" : "opacity-0",
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}

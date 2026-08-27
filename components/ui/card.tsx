import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

import type { VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

export const cardVariants = cva(
  "overflow-hidden rounded-none border-2 border-pixel-ink bg-surface shadow-pixel transition",
  {
    variants: {
      variant: {
        default: "",
        elevated: "shadow-pixel-lg",
        quest: "border-accent shadow-glow",
        achievement: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const titleBarColors = {
  primary: "bg-primary text-primary-foreground",
  pink: "bg-titlebar-pink text-pixel-ink",
  mint: "bg-titlebar-mint text-pixel-ink",
  accent: "bg-accent text-accent-foreground",
} as const;

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  /** Only meaningful when `variant="achievement"`. */
  locked?: boolean;
  /** Renders a window title-bar strip (with mock window controls) above the content. */
  title?: string;
  titleColor?: keyof typeof titleBarColors;
}

export function Card({
  className,
  variant,
  locked,
  title,
  titleColor = "primary",
  children,
  ...props
}: CardProps) {
  const isAchievement = variant === "achievement";

  return (
    <div
      className={cn(
        cardVariants({ variant }),
        isAchievement && (locked ? "opacity-50 grayscale" : "border-accent"),
      )}
      aria-disabled={isAchievement && locked ? true : undefined}
      {...props}
    >
      {title && (
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-b-2 border-pixel-ink px-2 py-1",
            titleBarColors[titleColor],
          )}
        >
          <span className="truncate text-xs font-bold tracking-wide">{title}</span>
          <span className="flex shrink-0 gap-1" aria-hidden="true">
            <span className="size-2.5 border border-pixel-ink bg-current opacity-60" />
            <span className="size-2.5 border border-pixel-ink bg-current opacity-60" />
            <span className="size-2.5 border border-pixel-ink bg-current" />
          </span>
        </div>
      )}
      <div className={cn("p-4", className)}>{children}</div>
    </div>
  );
}

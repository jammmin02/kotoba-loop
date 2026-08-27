import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "size-10 text-sm",
  md: "size-14 text-lg",
  lg: "size-20 text-2xl",
} as const;

export interface LevelBadgeProps {
  level: number;
  /** `level-up` plays a one-shot glow animation — use only right after a level-up event. */
  variant?: "default" | "level-up";
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function LevelBadge({
  level,
  variant = "default",
  size = "md",
  className,
}: LevelBadgeProps) {
  return (
    <div
      role="img"
      aria-label={`레벨 ${level}`}
      className={cn(
        "relative inline-flex flex-col items-center justify-center rounded-full border-2 border-pixel-ink bg-surface font-extrabold text-primary shadow-pixel-sm",
        sizeClasses[size],
        variant === "level-up" && "animate-level-up",
        className,
      )}
    >
      <span className="text-[0.5em] leading-none font-medium text-foreground/50">Lv.</span>
      <span className="leading-none">{level}</span>
    </div>
  );
}

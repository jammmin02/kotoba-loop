import { PixelFlame } from "@/components/icons/pixel-icons";
import { cn } from "@/lib/utils";

function getStreakTierClassName(days: number) {
  if (days <= 0) return "text-foreground/30";
  if (days < 3) return "text-warning";
  return "text-accent";
}

export interface StreakIndicatorProps {
  days: number;
  /** 보유 중인 스트릭 프리즈 개수(PROMPT 27.5). 생략하거나 0이면 표시하지 않는다. */
  freezeCount?: number;
  className?: string;
}

export function StreakIndicator({ days, freezeCount, className }: StreakIndicatorProps) {
  const clampedDays = Math.max(0, Math.trunc(days));
  const isHighTier = clampedDays >= 7;
  const tierClassName = getStreakTierClassName(clampedDays);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-none border-2 border-pixel-ink bg-surface px-3 py-1.5 shadow-pixel-sm",
        isHighTier && "shadow-glow",
        className,
      )}
    >
      <PixelFlame className={cn("size-4", tierClassName)} aria-hidden="true" />
      <span className={cn("text-sm font-bold", tierClassName)}>{clampedDays}일 연속</span>
      {!!freezeCount && freezeCount > 0 && (
        <span className="text-xs font-bold text-foreground/50">❄️ {freezeCount}개</span>
      )}
    </div>
  );
}

import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";

export interface ExpBarProps {
  /** EXP accumulated within the current level. */
  currentExp: number;
  /** EXP required to reach the next level. */
  requiredExp: number;
  className?: string;
}

export function ExpBar({ currentExp, requiredExp, className }: ExpBarProps) {
  const safeRequired = Math.max(requiredExp, 1);
  const clampedCurrent = Math.min(Math.max(currentExp, 0), safeRequired);
  const remaining = safeRequired - clampedCurrent;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <ProgressBar value={clampedCurrent} max={safeRequired} />
      <p className="text-xs font-bold text-foreground/60">
        {clampedCurrent} / {safeRequired} EXP · 다음 레벨까지 {remaining} EXP
      </p>
    </div>
  );
}

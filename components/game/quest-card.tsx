import { PixelCheck } from "@/components/icons/pixel-icons";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";

export interface QuestCardProps {
  title: string;
  current: number;
  target: number;
  rewardExp?: number;
  /** 방금(이 렌더 직전) 완료된 경우에만 true — 체크 등장 애니메이션을 1회 재생한다. */
  justCompleted?: boolean;
  className?: string;
}

export function QuestCard({
  title,
  current,
  target,
  rewardExp,
  justCompleted,
  className,
}: QuestCardProps) {
  const safeTarget = Math.max(target, 1);
  const clampedCurrent = Math.min(Math.max(current, 0), safeTarget);
  const completed = clampedCurrent >= safeTarget;

  return (
    <Card variant={completed ? "quest" : "default"} className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-sm font-bold", completed && "text-accent")}>{title}</p>
        {completed ? (
          <PixelCheck
            className={cn("size-5 shrink-0 text-accent", justCompleted && "animate-quest-complete")}
            aria-hidden="true"
          />
        ) : (
          <span className="shrink-0 text-xs text-foreground/50">
            {clampedCurrent}/{safeTarget}
          </span>
        )}
      </div>
      <ProgressBar value={clampedCurrent} max={safeTarget} />
      {rewardExp !== undefined && (
        <p className="text-xs text-foreground/50">보상 +{rewardExp} EXP</p>
      )}
    </Card>
  );
}

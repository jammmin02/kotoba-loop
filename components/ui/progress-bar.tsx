import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, max = 100, label, className }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <div className="flex items-center justify-between text-xs font-bold text-foreground/70">
          <span>{label}</span>
          <span>{Math.round(percent)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "진행률"}
        className="h-3 w-full overflow-hidden border-2 border-pixel-ink bg-background shadow-bevel-sunken"
      >
        <div
          className="h-full bg-primary transition-all"
          style={{
            width: `${percent}%`,
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(0,0,0,.18) 6px, rgba(0,0,0,.18) 8px)",
          }}
        />
      </div>
    </div>
  );
}

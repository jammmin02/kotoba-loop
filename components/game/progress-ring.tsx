import { cn } from "@/lib/utils";

export interface ProgressRingProps {
  value: number;
  max?: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({
  value,
  max = 100,
  label,
  size = 96,
  strokeWidth = 8,
  className,
}: ProgressRingProps) {
  const safeMax = Math.max(max, 1);
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  const center = size / 2;

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={label ? `${label}: ${Math.round(percent)}%` : `진행률 ${Math.round(percent)}%`}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none"
          style={{ stroke: "var(--pixel-ink)", strokeOpacity: 0.15 }}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="square"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          className="fill-none stroke-primary transition-[stroke-dashoffset] duration-500 ease-out"
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground font-extrabold"
          style={{ fontSize: size * 0.2 }}
        >
          {Math.round(percent)}%
        </text>
      </svg>
      {label && <span className="text-xs text-foreground/60">{label}</span>}
    </div>
  );
}

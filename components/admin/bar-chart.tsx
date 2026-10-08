import { cn } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
}

/**
 * 의존성 없는 막대 차트. 값이 모두 0이어도 높이가 깨지지 않도록 최댓값은 1 이상으로 잡는다.
 * 막대마다 title로 정확한 값을 보여주고, 접근성 도구에는 전체 요약을 aria-label로 준다.
 */
export function BarChart({
  data,
  title,
  barClassName = "bg-primary",
  unit = "",
}: {
  data: BarDatum[];
  title: string;
  barClassName?: string;
  unit?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const first = data[0]?.label;
  const last = data[data.length - 1]?.label;

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-bold">{title}</span>
        <span className="text-muted">
          합계 {total.toLocaleString("ko-KR")}
          {unit}
        </span>
      </figcaption>
      <div
        role="img"
        aria-label={`${title}: ${first}부터 ${last}까지 합계 ${total}${unit}`}
        className="flex h-28 items-end gap-px border-b-2 border-pixel-ink"
      >
        {data.map((d) => (
          <div
            key={d.label}
            title={`${d.label}: ${d.value.toLocaleString("ko-KR")}${unit}`}
            className="flex h-full min-w-0 flex-1 items-end"
          >
            <div
              className={cn("w-full", barClassName, d.value === 0 && "opacity-20")}
              style={{ height: `${Math.max(d.value === 0 ? 2 : 4, (d.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </figure>
  );
}

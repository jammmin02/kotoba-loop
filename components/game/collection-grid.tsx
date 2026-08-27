import { cn } from "@/lib/utils";

export interface CollectionItem {
  id: string;
  label: string;
  unlocked: boolean;
}

export interface CollectionGridProps {
  items: CollectionItem[];
  className?: string;
}

export function CollectionGrid({ items, className }: CollectionGridProps) {
  const unlockedCount = items.filter((item) => item.unlocked).length;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="text-xs font-bold text-foreground/60">
        {unlockedCount} / {items.length} 수집 완료
      </p>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {items.map((item) => (
          <div
            key={item.id}
            aria-label={item.unlocked ? item.label : `미보유: ${item.label}`}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-none border-2 border-pixel-ink p-2 text-center transition",
              item.unlocked
                ? "bg-surface text-foreground shadow-pixel-sm"
                : "bg-surface text-foreground/30 grayscale",
            )}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full border-2 border-pixel-ink text-sm font-bold",
                item.unlocked ? "bg-primary text-primary-foreground" : "bg-foreground/10",
              )}
            >
              {item.unlocked ? item.label.slice(0, 1) : "?"}
            </span>
            <span className="line-clamp-1 text-[10px] font-bold">
              {item.unlocked ? item.label : "???"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

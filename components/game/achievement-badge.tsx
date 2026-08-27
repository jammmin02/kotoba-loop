import { PixelBookOpen, PixelFlame, PixelLock, PixelPenTool } from "@/components/icons/pixel-icons";
import type { PixelIconComponent } from "@/components/icons/pixel-icons";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AchievementCategory = "word" | "kanji" | "streak";

const categoryIcons: Record<AchievementCategory, PixelIconComponent> = {
  word: PixelBookOpen,
  kanji: PixelPenTool,
  streak: PixelFlame,
};

export interface AchievementBadgeProps {
  title: string;
  category: AchievementCategory;
  locked: boolean;
  className?: string;
}

export function AchievementBadge({ title, category, locked, className }: AchievementBadgeProps) {
  const Icon = locked ? PixelLock : categoryIcons[category];

  return (
    <Card
      variant="achievement"
      locked={locked}
      className={cn("flex flex-col items-center gap-2 text-center", className)}
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full border-2 border-pixel-ink",
          locked
            ? "bg-foreground/10 text-foreground/40"
            : "bg-accent text-accent-foreground shadow-pixel-sm",
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <p className="text-xs font-bold text-foreground">{title}</p>
    </Card>
  );
}

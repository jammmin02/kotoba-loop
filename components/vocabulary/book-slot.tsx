import { PixelBookOpen, PixelGlobe, PixelLock, PixelStar } from "@/components/icons/pixel-icons";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

/**
 * 단어장을 게임 "세이브 슬롯"처럼 보여주는 공통 조각들 — 목록 카드(VocabularyBookCard),
 * 단어장 상세, 커뮤니티 단어장 목록/상세가 모두 이 조각들을 공유한다.
 */
export const SLOT_COLORS = ["mint", "pink", "primary", "accent"] as const;
export type SlotColor = (typeof SLOT_COLORS)[number];

export function slotColorForIndex(index: number): SlotColor {
  return SLOT_COLORS[index % SLOT_COLORS.length];
}

const titleBarClasses: Record<SlotColor, string> = {
  mint: "bg-titlebar-mint text-pixel-ink",
  pink: "bg-titlebar-pink text-pixel-ink",
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
};

const emblemClasses: Record<SlotColor, string> = {
  mint: "bg-titlebar-mint/40",
  pink: "bg-titlebar-pink/40",
  primary: "bg-primary/25",
  accent: "bg-accent/25",
};

/** 좌측 창 컨트롤 점 3개 + 우측에 배지(공개 여부, 통계 등)를 얹는 타이틀바. */
export function BookSlotTitleBar({ color, children }: { color: SlotColor; children?: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b-2 border-pixel-ink px-2 py-1",
        titleBarClasses[color],
      )}
    >
      <span className="flex shrink-0 gap-1" aria-hidden="true">
        <span className="size-2.5 border border-pixel-ink bg-current opacity-60" />
        <span className="size-2.5 border border-pixel-ink bg-current opacity-60" />
        <span className="size-2.5 border border-pixel-ink bg-current" />
      </span>
      {children}
    </div>
  );
}

export function BookEmblem({ color, className }: { color: SlotColor; className?: string }) {
  return (
    <div
      className={cn(
        "flex size-11 shrink-0 items-center justify-center border-2 border-pixel-ink shadow-bevel-raised",
        emblemClasses[color],
        className,
      )}
    >
      <PixelBookOpen className="size-6 text-foreground" aria-hidden="true" />
    </div>
  );
}

export function VisibilityChip({ isPublic }: { isPublic: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 whitespace-nowrap border-2 border-pixel-ink px-1.5 py-0.5 text-[11px] font-bold",
        isPublic ? "bg-secondary text-secondary-foreground" : "bg-surface text-foreground",
      )}
    >
      {isPublic ? (
        <PixelGlobe className="size-3 shrink-0" aria-hidden="true" />
      ) : (
        <PixelLock className="size-3 shrink-0" aria-hidden="true" />
      )}
      {isPublic ? "공개" : "비공개"}
    </span>
  );
}

/** 가져감 횟수처럼, 공개/비공개가 아닌 다른 통계를 타이틀바 배지로 보여줄 때. */
export function StatChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap border-2 border-pixel-ink bg-surface px-1.5 py-0.5 text-[11px] font-bold text-foreground">
      {icon}
      {label}
    </span>
  );
}

/** 완료 단어 ÷ 전체 단어 비율을 세이브 슬롯의 레벨로 환산한다. */
export function getMasteryLevel(ratio: number): number | "MASTER" {
  if (ratio >= 1) return "MASTER";
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

export function BookLevelBadge({ level }: { level: number | "MASTER" }) {
  if (level === "MASTER") {
    return (
      <div
        role="img"
        aria-label="마스터"
        className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-pixel-ink bg-accent text-accent-foreground shadow-pixel-sm"
      >
        <PixelStar className="size-4" aria-hidden="true" />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={`레벨 ${level}`}
      className="flex size-9 shrink-0 flex-col items-center justify-center rounded-full border-2 border-pixel-ink bg-primary text-primary-foreground shadow-pixel-sm leading-none"
    >
      <span className="text-[8px] font-medium opacity-80">Lv.</span>
      <span className="text-xs font-extrabold">{level}</span>
    </div>
  );
}

export function BookProgressGauge({
  masteredCount,
  wordCount,
  className,
}: {
  masteredCount: number;
  wordCount: number;
  className?: string;
}) {
  const ratio = wordCount > 0 ? masteredCount / wordCount : 0;
  const level = getMasteryLevel(ratio);
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BookLevelBadge level={level} />
      <ProgressBar value={masteredCount} max={Math.max(wordCount, 1)} className="flex-1" />
    </div>
  );
}

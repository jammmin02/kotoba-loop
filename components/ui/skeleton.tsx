import { cn } from "@/lib/utils";

/** 내용이 올 자리를 표시하는 회색 블록. 장식이라 스크린리더에는 숨긴다(안내는 SkeletonList가 한다). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-foreground/10 motion-safe:animate-pulse", className)}
    />
  );
}

type SkeletonVariant = "row" | "card" | "tile";

interface SkeletonListProps {
  /** 어떤 목록의 자리인지 — row: 단어 목록 한 줄, card: 단어장 카드, tile: 한자 타일. */
  variant: SkeletonVariant;
  /** 스크린리더에 읽어줄 안내 문구. */
  label?: string;
  count?: number;
  className?: string;
}

// 실제 목록과 레이아웃(열 수, 간격)을 맞춰 데이터가 들어올 때 화면이 밀리지 않게 한다.
const LAYOUT_CLASS_NAMES: Record<SkeletonVariant, string> = {
  row: "flex flex-col gap-3",
  card: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
  tile: "grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8",
};

const DEFAULT_COUNTS: Record<SkeletonVariant, number> = { row: 5, card: 6, tile: 24 };

function SkeletonItem({ variant }: { variant: SkeletonVariant }) {
  if (variant === "tile") {
    return (
      <div className="flex flex-col items-center gap-1 border-2 border-pixel-ink/30 bg-surface p-2">
        <Skeleton className="size-8" />
        <Skeleton className="h-2.5 w-8" />
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="flex flex-col gap-3 border-2 border-pixel-ink/30 bg-surface p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-6 h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 border-2 border-pixel-ink/30 bg-surface p-4">
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-6 w-14" />
    </div>
  );
}

export function SkeletonList({
  variant,
  label = "불러오는 중",
  count = DEFAULT_COUNTS[variant],
  className,
}: SkeletonListProps) {
  return (
    <div role="status" aria-busy="true" className={cn(LAYOUT_CLASS_NAMES[variant], className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonItem key={index} variant={variant} />
      ))}
    </div>
  );
}

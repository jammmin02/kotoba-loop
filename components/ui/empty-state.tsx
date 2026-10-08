import type { PixelIconComponent } from "@/components/icons/pixel-icons";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: PixelIconComponent;
  title: string;
  description?: string;
  /** 다음에 할 수 있는 행동(버튼/링크). 여러 개면 나란히 놓인다. */
  children?: ReactNode;
  /** card: 처음 쓰는 사용자에게 보여주는 큰 안내, inline: 검색/필터 결과가 없을 때의 가벼운 안내. */
  variant?: "card" | "inline";
  /** 결과가 바뀌어 비게 된 경우처럼, 나타났다는 사실을 스크린리더에도 알려야 할 때. */
  announce?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  variant = "card",
  announce,
  className,
}: EmptyStateProps) {
  const isCard = variant === "card";
  const body = (
    <>
      {Icon && (
        <Icon
          className={cn("shrink-0", isCard ? "size-16 text-primary" : "size-10 text-subtle")}
          aria-hidden="true"
        />
      )}
      <div className="flex flex-col gap-1">
        <p className={cn("font-bold text-foreground", isCard ? "text-lg" : "text-base")}>{title}</p>
        {description && <p className="text-sm font-content text-muted">{description}</p>}
      </div>
      {children && (
        <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>
      )}
    </>
  );

  if (isCard) {
    return (
      <Card
        variant="elevated"
        role={announce ? "status" : undefined}
        className={cn("flex flex-col items-center gap-4 py-12 text-center", className)}
      >
        {body}
      </Card>
    );
  }

  return (
    <div
      role={announce ? "status" : undefined}
      className={cn("flex flex-col items-center gap-3 py-10 text-center", className)}
    >
      {body}
    </div>
  );
}

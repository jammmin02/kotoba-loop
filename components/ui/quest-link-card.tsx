import Link from "next/link";

import { PixelChevronDown } from "@/components/icons/pixel-icons";
import type { PixelIconComponent } from "@/components/icons/pixel-icons";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface QuestLinkCardProps {
  href: string;
  /** 창 타이틀바에 뜨는 "실행 파일" 이름, 예: "QUEST_01.EXE". */
  fileName: string;
  titleColor: "primary" | "pink" | "mint" | "accent";
  icon: PixelIconComponent;
  /** 왼쪽 아이콘 박스 배경/전경색 클래스, 예: "bg-primary text-primary-foreground". */
  iconColor: string;
  title: string;
  description: string;
  badge?: { label: string; className: string };
}

/**
 * 메뉴 항목을 창 타이틀바가 달린 "퀘스트 실행 파일"처럼 보이게 하는 공용 카드
 * (AI 학습/단어 학습 허브 재스킨, 2026-08-27). Card의 title/titleColor + quest 배리언트를
 * 감싸 두 화면에서 동일한 모양을 재사용한다.
 */
export function QuestLinkCard({
  href,
  fileName,
  titleColor,
  icon: Icon,
  iconColor,
  title,
  description,
  badge,
}: QuestLinkCardProps) {
  return (
    <Link href={href}>
      <Card
        variant="quest"
        title={fileName}
        titleColor={titleColor}
        className="flex items-center gap-4 transition hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-y-0 active:shadow-pixel-sm"
      >
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center border-2 border-pixel-ink shadow-bevel-raised",
            iconColor,
          )}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">{title}</span>
            {badge && (
              <span
                className={cn(
                  "shrink-0 border-2 border-pixel-ink px-1.5 py-0.5 text-[10px] font-bold",
                  badge.className,
                )}
              >
                {badge.label}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-content text-foreground/60">{description}</p>
        </div>
        <PixelChevronDown className="size-4 shrink-0 -rotate-90 text-foreground/40" aria-hidden="true" />
      </Card>
    </Link>
  );
}

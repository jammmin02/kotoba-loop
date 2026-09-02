import { ChipButton } from "@/components/ui/chip-button";
import { cn } from "@/lib/utils";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/** 항목마다 색 필드가 없는 목록(단어장, 게임 모드 등)에 순환 배정하는 점 색상. */
const DOT_COLORS = [
  "bg-titlebar-pink",
  "bg-titlebar-mint",
  "bg-accent",
  "bg-primary",
  "bg-secondary",
];

export interface StampedChipButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  selected: boolean;
  /** 목록 내 위치 — `DOT_COLORS`를 순환 배정하는 데 쓴다. */
  colorIndex: number;
  /** 선택 시 튀어나오는 스탬프 문구. */
  stampLabel?: string;
  children: ReactNode;
}

/**
 * 선택 시 살짝 기울어지며 도장이 튀어나오는 칩 — 한자 상세의 "대표 단어를 단어장에 추가"
 * 모달에서 처음 만든 디자인을 커스텀 학습의 단어장/학습 방식 선택에도 그대로 재사용한다
 * (2026-08-27, 사용자 요청). `animate-quest-complete`(globals.css)는 퀘스트 완료 체크에도
 * 쓰는 애니메이션이라 여기서는 재생 도중 스탬프가 사라져 보이지 않도록 `opacity-100`을
 * 기본값으로 깔아, fill-mode가 없어도 재생이 끝난 뒤 항상 보이는 상태로 남게 한다.
 */
export function StampedChipButton({
  selected,
  colorIndex,
  stampLabel = "GET!",
  children,
  className,
  ...props
}: StampedChipButtonProps) {
  return (
    <div className="relative">
      <ChipButton
        selected={selected}
        className={cn("transition-transform", selected && "-rotate-2", className)}
        {...props}
      >
        <span
          className={cn(
            "mr-1.5 inline-block size-2 rounded-full border border-pixel-ink/40",
            DOT_COLORS[colorIndex % DOT_COLORS.length],
          )}
          aria-hidden="true"
        />
        {children}
      </ChipButton>
      {selected && (
        <span
          className="animate-quest-complete pointer-events-none absolute -top-3 -right-2 rotate-12 border-2 border-pixel-ink bg-accent px-1 py-0.5 text-[9px] font-bold text-accent-foreground opacity-100"
          aria-hidden="true"
        >
          {stampLabel}
        </span>
      )}
    </div>
  );
}

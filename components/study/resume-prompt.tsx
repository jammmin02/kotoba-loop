"use client";

import { Button } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/card";
import { formatSavedAgo, snapshotProgress } from "@/lib/study/saved-session";
import type { SavedSession } from "@/lib/study/saved-session";
import { cn } from "@/lib/utils";

export interface ResumePromptProps {
  saved: SavedSession;
  onResume: () => void;
  onDiscard: () => void;
  /** 카드 제목. 기본값은 세션 화면에 진입했을 때의 문구다. */
  title?: string;
  discardLabel?: string;
  className?: string;
}

/** 저장된 학습이 있을 때 "이어서 하기 / 새로 시작"을 묻는 카드 — 모든 학습 화면이 공유한다. */
export function ResumePrompt({
  saved,
  onResume,
  onDiscard,
  title = "하던 학습이 있어요",
  discardLabel = "새로 시작",
  className,
}: ResumePromptProps) {
  const { done, total } = snapshotProgress(saved.snapshot);

  return (
    <div
      className={cn(
        cardVariants({ variant: "elevated" }),
        "flex w-full max-w-md flex-col gap-3 p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold text-foreground">{title}</p>
        <p className="text-sm font-content text-foreground/60">
          {saved.label ? `${saved.label} · ` : ""}
          {done} / {total} 진행 · {formatSavedAgo(saved.savedAt)}
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="quest" className="flex-1" onClick={onResume}>
          이어서 하기
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={onDiscard}>
          {discardLabel}
        </Button>
      </div>
    </div>
  );
}

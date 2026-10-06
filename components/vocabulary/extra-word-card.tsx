"use client";

import { PixelX } from "@/components/icons/pixel-icons";
import { Card } from "@/components/ui/card";
import { emptyDraft } from "@/components/vocabulary/word-draft";
import type { WordDraft } from "@/components/vocabulary/word-draft";
import { WordFields } from "@/components/vocabulary/word-fields";
import { cn } from "@/lib/utils";

export interface ExtraWordEntry extends WordDraft {
  key: string;
  /** The synonym/related-expression chip text that spawned this entry — used to detect toggle-off.
   * Empty for cards the user added manually. */
  sourceText: string;
  /** Last validation/save error for this card; cleared as soon as the card is edited. */
  error?: string;
  expanded: boolean;
}

export function createExtraWordEntry(key: string, sourceText: string): ExtraWordEntry {
  return { ...emptyDraft(sourceText), key, sourceText, error: undefined, expanded: true };
}

interface ExtraWordCardProps {
  entry: ExtraWordEntry;
  index: number;
  onChangeDraft: (updater: (prev: WordDraft) => WordDraft) => void;
  onToggleExpanded: () => void;
  onRemove: () => void;
}

/** "함께 등록할 단어" 카드 — 접고 펼 수 있는 헤더 + 메인 단어와 같은 `WordFields`. */
export function ExtraWordCard({
  entry,
  index,
  onChangeDraft,
  onToggleExpanded,
  onRemove,
}: ExtraWordCardProps) {
  const summaryMeaning = entry.meanings.find((m) => m.trim());

  return (
    <Card className={cn("flex flex-col gap-4", entry.error ? "border-error" : "border-accent/60")}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={entry.expanded}
          aria-label={entry.expanded ? "카드 접기" : "카드 펼치기"}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="text-xs font-bold text-foreground/60" aria-hidden="true">
            {entry.expanded ? "▾" : "▸"}
          </span>
          <span className="shrink-0 text-sm font-medium text-foreground">단어 {index + 2}</span>
          {!entry.expanded && (
            <span className="min-w-0 flex-1 truncate text-sm text-foreground/70">
              {entry.word || "(단어 없음)"}
              {summaryMeaning ? ` — ${summaryMeaning}` : ""}
            </span>
          )}
          {!entry.expanded && entry.error && (
            <span className="shrink-0 text-xs font-bold text-error">⚠ 확인 필요</span>
          )}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="추가 단어 삭제"
          className="flex size-11 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground/60 shadow-bevel-raised transition hover:bg-background"
        >
          <PixelX className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {entry.error && (
        <p role="alert" className="text-xs text-error">
          {entry.error}
        </p>
      )}

      {entry.expanded && <WordFields draft={entry} onChange={onChangeDraft} variant="nested" />}
    </Card>
  );
}

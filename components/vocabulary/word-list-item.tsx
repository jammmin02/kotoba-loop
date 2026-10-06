import Link from "next/link";
import { memo } from "react";

import { HighlightText } from "@/components/search/highlight-text";
import { JlptBadge, StatusBadge, TagBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FavoriteButton } from "@/components/vocabulary/favorite-button";
import { cn } from "@/lib/utils";
import type { VocabularySummary } from "@/types/vocabulary";

export interface WordListItemProps {
  word: VocabularySummary;
  /** When provided, wraps matching substrings of word/reading/meaning in <mark>. */
  highlightQuery?: string;
  /** When provided, the word detail page can navigate to prev/next words within this book. */
  bookId?: string;
  /** 선택 모드 — 항목을 누르면 상세로 가는 대신 선택/해제된다(단어장 상세의 일괄 삭제용). */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const WordListItem = memo(function WordListItem({
  word,
  highlightQuery,
  bookId,
  selectable = false,
  selected = false,
  onToggleSelect,
}: WordListItemProps) {
  if (selectable) {
    return (
      <Card
        className={cn(
          "flex cursor-pointer items-center gap-3 transition hover:bg-background",
          selected && "bg-primary/10",
        )}
        onClick={() => onToggleSelect?.(word.id)}
      >
        {/* 카드 전체가 토글 영역이라 체크박스의 클릭은 카드로 올라가지 않게 막아 이중 토글을 피한다. */}
        <span onClick={(event) => event.stopPropagation()}>
          <Checkbox
            checked={selected}
            onChange={() => onToggleSelect?.(word.id)}
            aria-label={`${word.word} 선택`}
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="font-jp text-lg font-bold text-foreground">{word.word}</span>
            <span className="font-jp text-sm text-foreground/60">{word.reading}</span>
          </div>
          <p className="truncate text-sm font-content text-foreground/60">
            {word.meanings.join(", ")}
          </p>
        </div>
        <StatusBadge status={word.learningStatus} />
      </Card>
    );
  }

  const detailHref = bookId ? `/words/${word.id}?bookId=${bookId}` : `/words/${word.id}`;
  return (
    <Card className="flex flex-col gap-2 transition hover:bg-background">
      <div className="flex items-center justify-between gap-3">
        <Link href={detailHref} className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="font-jp text-lg font-bold text-foreground">
              <HighlightText text={word.word} query={highlightQuery} />
            </span>
            <span className="font-jp text-sm text-foreground/60">
              <HighlightText text={word.reading} query={highlightQuery} />
            </span>
          </div>
          <p className="truncate text-sm font-content text-foreground/60">
            <HighlightText text={word.meanings.join(", ")} query={highlightQuery} />
          </p>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <FavoriteButton vocabularyId={word.id} isFavorite={word.isFavorite} />
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status={word.learningStatus} />
            {word.jlptLevel && <JlptBadge level={word.jlptLevel} />}
          </div>
        </div>
      </div>
      {word.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {word.tags.map((tag) => (
            <TagBadge key={tag.id} name={tag.name} />
          ))}
        </div>
      )}
    </Card>
  );
});

import Link from "next/link";
import { memo } from "react";

import { HighlightText } from "@/components/search/highlight-text";
import { JlptBadge, StatusBadge, TagBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FavoriteButton } from "@/components/vocabulary/favorite-button";
import type { VocabularySummary } from "@/types/vocabulary";

export interface WordListItemProps {
  word: VocabularySummary;
  /** When provided, wraps matching substrings of word/reading/meaning in <mark>. */
  highlightQuery?: string;
}

export const WordListItem = memo(function WordListItem({
  word,
  highlightQuery,
}: WordListItemProps) {
  return (
    <Card className="flex flex-col gap-2 transition hover:bg-background">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/words/${word.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
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

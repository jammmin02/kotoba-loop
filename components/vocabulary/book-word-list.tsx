"use client";

import { useMemo, useState } from "react";

import { PixelBookOpen } from "@/components/icons/pixel-icons";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WordListItem } from "@/components/vocabulary/word-list-item";
import {
  matchesWordQuery,
  sortWordSummaries,
  WORD_SORT_OPTIONS,
  type WordSortKey,
} from "@/lib/vocabulary/sort";
import type { VocabularySummary } from "@/types/vocabulary";

interface BookWordListProps {
  bookId: string;
  words: VocabularySummary[];
}

export function BookWordList({ bookId, words }: BookWordListProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<WordSortKey>("createdDesc");

  const visibleWords = useMemo(() => {
    const matched = words.filter((word) => matchesWordQuery(word, query));
    return sortWordSummaries(matched, sortKey);
  }, [words, query, sortKey]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="단어, 읽기, 뜻으로 검색"
          className="min-w-40 flex-1"
        />
        <Select
          label="정렬"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as WordSortKey)}
          options={WORD_SORT_OPTIONS}
          className="min-w-40"
        />
      </div>

      {visibleWords.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          <PixelBookOpen className="size-10 text-foreground/30" aria-hidden="true" />
          <p className="text-sm font-bold text-foreground">조건에 맞는 단어가 없어요</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleWords.map((word) => (
            <WordListItem key={word.id} word={word} bookId={bookId} highlightQuery={query} />
          ))}
        </div>
      )}
    </div>
  );
}

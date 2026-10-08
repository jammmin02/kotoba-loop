"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { PixelBookOpen } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LoadMore } from "@/components/ui/load-more";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { WordListItem } from "@/components/vocabulary/word-list-item";
import { useIncrementalList } from "@/lib/hooks/use-incremental-list";
import { scheduleBookWordsRemoval, UNDO_WINDOW_MS } from "@/lib/pending-deletion/actions";
import { filterHiddenWords } from "@/lib/pending-deletion/hidden";
import { useHiddenSpecs } from "@/lib/pending-deletion/store";
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

export function BookWordList({ bookId, words: serverWords }: BookWordListProps) {
  const queryClient = useQueryClient();
  // 삭제 대기 중이거나 방금 삭제한 단어는 서버가 내려준 목록에 아직 있어도 숨긴다.
  const hiddenSpecs = useHiddenSpecs();
  const words = useMemo(
    () => filterHiddenWords(serverWords, hiddenSpecs, bookId),
    [serverWords, hiddenSpecs, bookId],
  );
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<WordSortKey>("createdDesc");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const visibleWords = useMemo(() => {
    const matched = words.filter((word) => matchesWordQuery(word, query));
    return sortWordSummaries(matched, sortKey);
  }, [words, query, sortKey]);

  // 수천 개여도 처음엔 앞부분만 그린다. "전체 선택"과 개수는 아래 전체 목록(visibleWords) 기준이다.
  const { shownItems, shownCount, remaining, hasMore, loadMore } = useIncrementalList(
    visibleWords,
    { resetKey: `${query.trim()}|${sortKey}`, storagePrefix: `book-words:${bookId}` },
  );

  // 검색으로 가려진 단어가 선택에 남아 의도치 않게 삭제되지 않도록, 보이는 단어만 선택으로 센다.
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleSelectedIds = useMemo(
    () => visibleWords.filter((word) => selectedIdSet.has(word.id)).map((word) => word.id),
    [visibleWords, selectedIdSet],
  );
  const allVisibleSelected =
    visibleWords.length > 0 && visibleSelectedIds.length === visibleWords.length;

  function removeSelected() {
    scheduleBookWordsRemoval({ bookId, wordIds: visibleSelectedIds, queryClient });
    setConfirmOpen(false);
    exitSelecting();
  }

  function exitSelecting() {
    setIsSelecting(false);
    setSelectedIds([]);
  }

  function toggleSelected(id: string) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function toggleAllVisible() {
    setSelectedIds(allVisibleSelected ? [] : visibleWords.map((word) => word.id));
  }

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

      {isSelecting ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-pixel-ink bg-surface p-2">
          <Checkbox
            label={`전체 선택 (${visibleSelectedIds.length}/${visibleWords.length})`}
            checked={allVisibleSelected}
            disabled={visibleWords.length === 0}
            onChange={toggleAllVisible}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={exitSelecting}>
              취소
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={visibleSelectedIds.length === 0}
              onClick={() => setConfirmOpen(true)}
            >
              {visibleSelectedIds.length}개 삭제
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsSelecting(true)}>
            선택
          </Button>
        </div>
      )}

      {visibleWords.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          <PixelBookOpen className="size-10 text-subtle" aria-hidden="true" />
          <p className="text-sm font-bold text-foreground">조건에 맞는 단어가 없어요</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {shownItems.map((word) => (
            <div key={word.id} className="defer-render">
              <WordListItem
                word={word}
                bookId={bookId}
                highlightQuery={query}
                selectable={isSelecting}
                selected={selectedIdSet.has(word.id)}
                onToggleSelect={toggleSelected}
              />
            </div>
          ))}
          <LoadMore
            hasMore={hasMore}
            remaining={remaining}
            shownCount={shownCount}
            onLoadMore={loadMore}
          />
        </div>
      )}

      {confirmOpen && (
        <Modal open onClose={() => setConfirmOpen(false)} title="단어 삭제">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground">
              선택한 <span className="font-bold">{visibleSelectedIds.length}개</span> 단어를 이
              단어장에서 삭제할까요? 다른 단어장에도 있는 단어는 그쪽에 그대로 남고, 어느 단어장에도
              없게 되는 단어는 뜻·예문·학습 기록까지 완전히 삭제돼요.
            </p>
            <p className="text-xs text-muted">
              삭제 후 {UNDO_WINDOW_MS / 1000}초 안에는 &apos;실행 취소&apos;로 되돌릴 수 있어요.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                취소
              </Button>
              <Button type="button" variant="danger" onClick={removeSelected}>
                삭제
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

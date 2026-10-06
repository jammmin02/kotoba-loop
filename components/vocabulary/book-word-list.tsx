"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PixelBookOpen } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { WordListItem } from "@/components/vocabulary/word-list-item";
import { ApiClientError, apiFetch } from "@/lib/api/client";
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<WordSortKey>("createdDesc");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const visibleWords = useMemo(() => {
    const matched = words.filter((word) => matchesWordQuery(word, query));
    return sortWordSummaries(matched, sortKey);
  }, [words, query, sortKey]);

  // 검색으로 가려진 단어가 선택에 남아 의도치 않게 삭제되지 않도록, 보이는 단어만 선택으로 센다.
  const visibleSelectedIds = useMemo(
    () => visibleWords.filter((word) => selectedIds.includes(word.id)).map((word) => word.id),
    [visibleWords, selectedIds],
  );
  const allVisibleSelected =
    visibleWords.length > 0 && visibleSelectedIds.length === visibleWords.length;

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch<{ deletedCount: number }>("/api/vocabularies/bulk-delete", {
        method: "POST",
        body: { ids },
      }),
    onSuccess: ({ deletedCount }) => {
      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
      toast.success(`${deletedCount}개 단어를 삭제했습니다.`);
      setConfirmOpen(false);
      exitSelecting();
      router.refresh();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "삭제 중 오류가 발생했습니다.");
    },
  });

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
          <PixelBookOpen className="size-10 text-foreground/30" aria-hidden="true" />
          <p className="text-sm font-bold text-foreground">조건에 맞는 단어가 없어요</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleWords.map((word) => (
            <WordListItem
              key={word.id}
              word={word}
              bookId={bookId}
              highlightQuery={query}
              selectable={isSelecting}
              selected={selectedIds.includes(word.id)}
              onToggleSelect={toggleSelected}
            />
          ))}
        </div>
      )}

      {confirmOpen && (
        <Modal open onClose={() => setConfirmOpen(false)} title="단어 삭제">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground">
              선택한 <span className="font-bold">{visibleSelectedIds.length}개</span> 단어를
              삭제할까요? 등록된 뜻과 예문, 학습 기록도 함께 삭제되고, 다른 단어장에 있는 같은
              단어도 사라집니다. 되돌릴 수 없어요.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                취소
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => deleteMutation.mutate(visibleSelectedIds)}
                loading={deleteMutation.isPending}
              >
                삭제
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

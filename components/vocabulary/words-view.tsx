"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  PixelBookOpen,
  PixelCamera,
  PixelPlus,
  PixelSearch,
  PixelStar,
} from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SkeletonList } from "@/components/ui/skeleton";
import { TagManagerModal } from "@/components/vocabulary/tag-manager-modal";
import { TagStudyButton } from "@/components/vocabulary/tag-study-button";
import { WordListItem } from "@/components/vocabulary/word-list-item";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  matchesWordQuery,
  sortWordSummaries,
  WORD_SORT_OPTIONS,
  type WordSortKey,
} from "@/lib/vocabulary/sort";
import type { TagSummary } from "@/types/tag";
import type { VocabularySummary } from "@/types/vocabulary";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "전체 상태" },
  { value: "NEW", label: "NEW" },
  { value: "LEARNING", label: "학습중" },
  { value: "REVIEW", label: "복습" },
  { value: "WEAK", label: "취약" },
  { value: "MASTERED", label: "마스터" },
];

interface WordsViewProps {
  initialBookId?: string;
}

export function WordsView({ initialBookId }: WordsViewProps) {
  const [bookId, setBookId] = useState(initialBookId ?? "");
  const [status, setStatus] = useState("");
  const [tagId, setTagId] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<WordSortKey>("createdDesc");

  const { data: books } = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiFetch<TagSummary[]>("/api/tags"),
  });

  const {
    data: words,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["vocabularies", bookId, status, tagId, favoriteOnly],
    queryFn: () => {
      const params = new URLSearchParams();
      if (bookId) params.set("bookId", bookId);
      if (status) params.set("status", status);
      if (tagId) params.set("tagId", tagId);
      if (favoriteOnly) params.set("favorite", "true");
      const query = params.toString();
      return apiFetch<VocabularySummary[]>(`/api/vocabularies${query ? `?${query}` : ""}`);
    },
  });

  const newWordHref = bookId ? `/words/new?bookId=${bookId}` : "/words/new";
  const hasFilters = !!(bookId || status || tagId || favoriteOnly);

  function resetFilters() {
    setBookId("");
    setStatus("");
    setTagId("");
    setFavoriteOnly(false);
  }

  const visibleWords = useMemo(() => {
    const matched = (words ?? []).filter((word) => matchesWordQuery(word, query));
    return sortWordSummaries(matched, sortKey);
  }, [words, query, sortKey]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-foreground">내 단어</h1>
        <Link href={newWordHref}>
          <Button type="button">
            <PixelPlus className="size-4" aria-hidden="true" />새 단어
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="단어장"
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          options={[
            { value: "", label: "전체 단어장" },
            ...(books ?? []).map((b) => ({ value: b.id, label: b.name })),
          ]}
          className="min-w-40"
        />
        <Select
          label="학습 상태"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_FILTER_OPTIONS}
          className="min-w-40"
        />
        <Select
          label="태그"
          value={tagId}
          onChange={(e) => setTagId(e.target.value)}
          options={[
            { value: "", label: "전체 태그" },
            ...(tags ?? []).map((t) => ({ value: t.id, label: `#${t.name}` })),
          ]}
          className="min-w-40"
        />
        {tagId && (
          <TagStudyButton tagId={tagId} tagName={tags?.find((t) => t.id === tagId)?.name ?? ""} />
        )}
        <button
          type="button"
          onClick={() => setFavoriteOnly((prev) => !prev)}
          aria-pressed={favoriteOnly}
          className={cn(
            "flex h-10 items-center gap-1.5 border-2 border-pixel-ink px-3 text-sm font-bold transition",
            favoriteOnly
              ? "bg-warning text-warning-foreground shadow-bevel-sunken"
              : "bg-surface text-foreground shadow-bevel-raised hover:bg-background",
          )}
        >
          <PixelStar className="size-4" aria-hidden="true" />
          즐겨찾기만
        </button>
        <button
          type="button"
          onClick={() => setTagManagerOpen(true)}
          className="h-10 border-2 border-pixel-ink bg-surface px-3 text-sm font-bold text-muted shadow-bevel-raised transition hover:bg-background"
        >
          태그 관리
        </button>
      </div>

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

      <TagManagerModal open={tagManagerOpen} onClose={() => setTagManagerOpen(false)} />

      {isLoading && <SkeletonList variant="row" label="단어를 불러오는 중" />}

      {isError && (
        <ErrorState
          error={error}
          fallbackMessage="단어를 불러오지 못했습니다."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}

      {/* 서버 결과가 비었을 때: 아직 단어가 없는 경우와 필터에 걸러진 경우를 구분한다. */}
      {words && words.length === 0 && !hasFilters && (
        <EmptyState
          icon={PixelBookOpen}
          title="아직 등록된 단어가 없어요"
          description="직접 입력하거나, 교재 사진으로 한 번에 가져와 보세요."
        >
          <Link href={newWordHref}>
            <Button type="button">
              <PixelPlus className="size-4" aria-hidden="true" />
              단어 등록하기
            </Button>
          </Link>
          <Link href="/vocabulary/photos/new">
            <Button type="button" variant="outline">
              <PixelCamera className="size-4" aria-hidden="true" />
              사진으로 가져오기
            </Button>
          </Link>
        </EmptyState>
      )}

      {words && words.length === 0 && hasFilters && (
        <EmptyState
          variant="inline"
          announce
          icon={PixelSearch}
          title="조건에 맞는 단어가 없어요"
          description="선택한 단어장, 상태, 태그, 즐겨찾기 조건을 조정해 보세요."
        >
          <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
            필터 초기화
          </Button>
        </EmptyState>
      )}

      {/* 서버 결과는 있지만 검색어에 걸러져 모두 사라진 경우. */}
      {words && words.length > 0 && visibleWords.length === 0 && (
        <EmptyState
          variant="inline"
          announce
          icon={PixelSearch}
          title="검색 결과가 없어요"
          description={`"${query.trim()}"와 일치하는 단어, 읽기, 뜻이 없어요.`}
        >
          <Button type="button" variant="outline" size="sm" onClick={() => setQuery("")}>
            검색어 지우기
          </Button>
        </EmptyState>
      )}

      {visibleWords.length > 0 && (
        <div className="flex flex-col gap-3">
          {visibleWords.map((word) => (
            <WordListItem
              key={word.id}
              word={word}
              bookId={bookId || undefined}
              highlightQuery={query}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

import {
  PixelBookOpen,
  PixelCamera,
  PixelPlus,
  PixelSearch,
  PixelStar,
  PixelX,
} from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { LoadMore } from "@/components/ui/load-more";
import { Select } from "@/components/ui/select";
import { SkeletonList } from "@/components/ui/skeleton";
import { TagManagerModal } from "@/components/vocabulary/tag-manager-modal";
import { TagStudyButton } from "@/components/vocabulary/tag-study-button";
import { WordListItem } from "@/components/vocabulary/word-list-item";
import { apiFetch } from "@/lib/api/client";
import { toKstDateKey } from "@/lib/datetime";
import { useIncrementalList } from "@/lib/hooks/use-incremental-list";
import { filterHiddenWords } from "@/lib/pending-deletion/hidden";
import { useHiddenSpecs } from "@/lib/pending-deletion/store";
import { cn } from "@/lib/utils";
import {
  applyWordListFilters,
  buildFilterChips,
  clearAllFilters,
  clearFilter,
  DUE_FILTER_OPTIONS,
  matchesDueFilter,
  parseWordListFilters,
  STATUS_FILTER_OPTIONS,
} from "@/lib/vocabulary/filter";
import type { DueFilter, FilterChipKey, WordListFilters } from "@/lib/vocabulary/filter";
import {
  matchesWordQuery,
  sortWordSummaries,
  WORD_SORT_OPTIONS,
  type WordSortKey,
} from "@/lib/vocabulary/sort";
import type { TagSummary } from "@/types/tag";
import type { VocabularySummary } from "@/types/vocabulary";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

/** 검색어 입력이 멈춘 뒤 URL에 반영하기까지의 대기 시간 — 타자마다 주소창을 바꾸지 않으려는 값. */
const QUERY_URL_DEBOUNCE_MS = 250;

/**
 * 내 단어 목록. 필터/검색/정렬 상태는 URL 쿼리가 단일 출처라(`lib/vocabulary/filter`) 새로고침, 링크
 * 공유, 단어 상세에서 뒤로가기 뒤에도 같은 화면이 복원된다. 단어장/상태/태그/즐겨찾기는 서버가 걸러서
 * 내려주고, 복습 예정·검색어·정렬은 받아온 목록에 클라이언트에서 적용한다. 긴 목록은 앞에서부터
 * 나눠 그린다(`useIncrementalList`).
 */
export function WordsView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const filters = useMemo(
    () => parseWordListFilters(new URLSearchParams(searchParamsString)),
    [searchParamsString],
  );

  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  // 모바일에서는 필터 영역을 접어 두고, sm 이상에서는 항상 펼쳐 보인다.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // 서버 응답을 기다리지 않고 주소창만 바꾼다(window.history는 Next 라우터와 연동돼 `useSearchParams`
  // 가 따라온다 — 필터마다 서버 컴포넌트를 다시 받지 않는다). 항목이 쌓이지 않게 replace를 쓴다.
  const setFilters = useCallback(
    (next: WordListFilters) => {
      const params = applyWordListFilters(new URLSearchParams(window.location.search), next);
      const query = params.toString();
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [pathname],
  );

  // 입력창은 즉시 반응해야 하므로 별도 상태로 두고, 멈춘 뒤에 URL(filters.query)로 보낸다. URL이
  // 바깥에서 바뀌면(뒤로가기, 칩 해제) 입력창도 따라가게 렌더 중에 맞춘다.
  const [inputValue, setInputValue] = useState(filters.query);
  const [syncedQuery, setSyncedQuery] = useState(filters.query);
  if (filters.query !== syncedQuery) {
    setSyncedQuery(filters.query);
    setInputValue(filters.query);
  }
  useEffect(() => {
    if (inputValue.trim() === filters.query.trim()) return;
    const timer = setTimeout(
      () => setFilters({ ...filters, query: inputValue }),
      QUERY_URL_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [inputValue, filters, setFilters]);
  const deferredQuery = useDeferredValue(inputValue);

  const { data: books } = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiFetch<TagSummary[]>("/api/tags"),
  });

  const {
    data: serverWords,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["vocabularies", filters.bookId, filters.status, filters.tagId, filters.favoriteOnly],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.bookId) params.set("bookId", filters.bookId);
      if (filters.status) params.set("status", filters.status);
      if (filters.tagId) params.set("tagId", filters.tagId);
      if (filters.favoriteOnly) params.set("favorite", "true");
      const query = params.toString();
      return apiFetch<VocabularySummary[]>(`/api/vocabularies${query ? `?${query}` : ""}`);
    },
  });

  // 삭제 대기 중이거나 방금 삭제한 단어는 서버 응답에 아직 있어도 숨긴다(실행 취소하면 돌아온다).
  const hiddenSpecs = useHiddenSpecs();
  const words = useMemo(
    () => serverWords && filterHiddenWords(serverWords, hiddenSpecs, filters.bookId || undefined),
    [serverWords, hiddenSpecs, filters.bookId],
  );

  const newWordHref = filters.bookId ? `/words/new?bookId=${filters.bookId}` : "/words/new";
  const hasServerFilters = !!(
    filters.bookId ||
    filters.status ||
    filters.tagId ||
    filters.favoriteOnly
  );

  const chips = useMemo(
    () =>
      buildFilterChips(filters, {
        bookName: (id) => books?.find((book) => book.id === id)?.name,
        tagName: (id) => tags?.find((tag) => tag.id === id)?.name,
      }),
    [filters, books, tags],
  );
  const hasNonQueryFilters = chips.some((chip) => chip.key !== "query");
  // 접힌 필터 버튼에 붙일 개수 — 검색어는 항상 보이는 입력창이 있으니 제외한다.
  const activeFilterCount = chips.filter((chip) => chip.key !== "query").length;

  const todayKey = toKstDateKey(new Date());
  const visibleWords = useMemo(() => {
    const matched = (words ?? []).filter(
      (word) =>
        matchesDueFilter(word, filters.due, todayKey) && matchesWordQuery(word, deferredQuery),
    );
    return sortWordSummaries(matched, filters.sortKey);
  }, [words, filters.due, filters.sortKey, deferredQuery, todayKey]);

  const { shownItems, shownCount, remaining, hasMore, loadMore } = useIncrementalList(
    visibleWords,
    {
      resetKey: applyWordListFilters(new URLSearchParams(), filters).toString(),
      storagePrefix: "words-list",
    },
  );

  function removeChip(key: FilterChipKey) {
    if (key === "query") setInputValue("");
    setFilters(clearFilter(filters, key));
  }

  function resetAll() {
    setInputValue("");
    setFilters(clearAllFilters(filters));
  }

  const trueEmpty = !!words && words.length === 0 && !hasServerFilters;

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

      <div className="flex flex-col gap-3">
        <div className="sm:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={filtersOpen}
            aria-controls="word-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            필터{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
        </div>

        <div
          id="word-filters"
          className={cn("flex-wrap items-end gap-3 sm:flex", filtersOpen ? "flex" : "hidden")}
        >
          <Select
            label="단어장"
            value={filters.bookId}
            onChange={(e) => setFilters({ ...filters, bookId: e.target.value })}
            options={[
              { value: "", label: "전체 단어장" },
              ...(books ?? []).map((b) => ({ value: b.id, label: b.name })),
            ]}
            className="min-w-40"
          />
          <Select
            label="학습 상태"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            options={[...STATUS_FILTER_OPTIONS]}
            className="min-w-40"
          />
          <Select
            label="복습 예정"
            value={filters.due}
            onChange={(e) => setFilters({ ...filters, due: e.target.value as DueFilter | "" })}
            options={[...DUE_FILTER_OPTIONS]}
            className="min-w-40"
          />
          <Select
            label="태그"
            value={filters.tagId}
            onChange={(e) => setFilters({ ...filters, tagId: e.target.value })}
            options={[
              { value: "", label: "전체 태그" },
              ...(tags ?? []).map((t) => ({ value: t.id, label: `#${t.name}` })),
            ]}
            className="min-w-40"
          />
          {filters.tagId && (
            <TagStudyButton
              tagId={filters.tagId}
              tagName={tags?.find((t) => t.id === filters.tagId)?.name ?? ""}
            />
          )}
          <button
            type="button"
            onClick={() => setFilters({ ...filters, favoriteOnly: !filters.favoriteOnly })}
            aria-pressed={filters.favoriteOnly}
            className={cn(
              "touch-target flex h-10 items-center gap-1.5 border-2 border-pixel-ink px-3 text-sm font-bold transition",
              filters.favoriteOnly
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
            className="touch-target h-10 border-2 border-pixel-ink bg-surface px-3 text-sm font-bold text-muted shadow-bevel-raised transition hover:bg-background"
          >
            태그 관리
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="검색"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="단어, 읽기, 뜻으로 검색"
            className="min-w-40 flex-1"
          />
          <Select
            label="정렬"
            value={filters.sortKey}
            onChange={(e) => setFilters({ ...filters, sortKey: e.target.value as WordSortKey })}
            options={WORD_SORT_OPTIONS}
            className="min-w-40"
          />
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <ul aria-label="적용된 필터" className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    onClick={() => removeChip(chip.key)}
                    aria-label={`${chip.label} 필터 해제`}
                    className="touch-target inline-flex items-center gap-1.5 border-2 border-pixel-ink bg-surface px-2.5 py-1 text-xs font-bold text-foreground shadow-bevel-raised transition hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {chip.label}
                    <PixelX className="size-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="ghost" size="sm" onClick={resetAll}>
              전체 초기화
            </Button>
          </div>
        )}
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

      {/* 서버 결과가 비었고 걸러낸 조건도 없을 때만 "아직 단어가 없어요". */}
      {trueEmpty && (
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

      {words && !trueEmpty && visibleWords.length === 0 && (
        <EmptyState
          variant="inline"
          announce
          icon={PixelSearch}
          title={hasNonQueryFilters ? "조건에 맞는 단어가 없어요" : "검색 결과가 없어요"}
          description={
            hasNonQueryFilters
              ? "적용한 필터나 검색어를 조정해 보세요."
              : `"${filters.query.trim()}"와 일치하는 단어, 읽기, 뜻이 없어요.`
          }
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={hasNonQueryFilters ? resetAll : () => removeChip("query")}
          >
            {hasNonQueryFilters ? "필터 초기화" : "검색어 지우기"}
          </Button>
        </EmptyState>
      )}

      {visibleWords.length > 0 && (
        <div className="flex flex-col gap-3">
          <p role="status" className="text-xs text-muted">
            {visibleWords.length}개의 단어{hasMore && ` · ${shownCount}개 표시 중`}
          </p>
          {shownItems.map((word) => (
            <div key={word.id} className="defer-render">
              <WordListItem
                word={word}
                bookId={filters.bookId || undefined}
                highlightQuery={deferredQuery}
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
    </div>
  );
}

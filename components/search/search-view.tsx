"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { PixelSearch } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { VoiceInputButton } from "@/components/ui/voice-input-button";
import { WordListItem } from "@/components/vocabulary/word-list-item";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { useRecentSearchesStore } from "@/lib/stores/recent-searches-store";
import type { SearchResponse } from "@/types/search";

import type { FormEvent } from "react";

interface SearchViewProps {
  initialQuery: string;
}

export function SearchView({ initialQuery }: SearchViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") ?? initialQuery;
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const trimmedQuery = query.trim();

  // Resyncs the input when the URL's `q` changes externally (nav search box,
  // back/forward, recent-search chip) without an effect — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [inputValue, setInputValue] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    setInputValue(query);
  }

  const addRecentSearch = useRecentSearchesStore((s) => s.add);
  const recentQueries = useRecentSearchesStore((s) => s.queries);
  const removeRecentSearch = useRecentSearchesStore((s) => s.remove);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["search", trimmedQuery, page],
    queryFn: () =>
      apiFetch<SearchResponse>(`/api/search?q=${encodeURIComponent(trimmedQuery)}&page=${page}`),
    enabled: trimmedQuery.length > 0,
  });

  function goToQuery(next: string, nextPage = 1) {
    const trimmed = next.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    if (nextPage > 1) params.set("page", String(nextPage));
    router.push(`/search${params.toString() ? `?${params}` : ""}`);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submitQuery(inputValue);
  }

  function submitQuery(next: string) {
    const trimmed = next.trim();
    if (!trimmed) return;
    setInputValue(trimmed);
    addRecentSearch(trimmed);
    goToQuery(trimmed);
  }

  const result = data?.vocabularies;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-foreground">검색</h1>

      <form onSubmit={handleSubmit} role="search" className="flex gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center gap-2 border-2 border-pixel-ink bg-background px-3 shadow-bevel-sunken focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
          <PixelSearch className="size-4 shrink-0 text-foreground/50" aria-hidden="true" />
          <input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="단어, 뜻, 태그, JLPT, 품사로 검색"
            aria-label="검색어"
            className="h-full w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
          />
        </div>
        <VoiceInputButton onResult={submitQuery} />
        <Button type="submit" className="shrink-0">
          검색
        </Button>
      </form>

      {!trimmedQuery && recentQueries.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-foreground/60">최근 검색어</p>
          <div className="flex flex-wrap gap-1.5">
            {recentQueries.map((q) => (
              <span
                key={q}
                className="inline-flex items-center gap-1 border-2 border-pixel-ink bg-surface px-2.5 py-1 text-xs font-bold text-foreground/80"
              >
                <button type="button" onClick={() => goToQuery(q)} className="hover:text-primary">
                  {q}
                </button>
                <button
                  type="button"
                  onClick={() => removeRecentSearch(q)}
                  aria-label={`${q} 최근 검색어 삭제`}
                  className="hover:text-error"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {!trimmedQuery && recentQueries.length === 0 && (
        <p className="py-16 text-center text-sm font-content text-foreground/60">
          검색어를 입력해주세요.
        </p>
      )}

      {trimmedQuery && isLoading && <p className="text-sm text-foreground/60">검색 중...</p>}

      {trimmedQuery && isError && (
        <p className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "검색 중 오류가 발생했습니다."}
        </p>
      )}

      {trimmedQuery && result && result.items.length === 0 && (
        <div className="flex flex-col items-center gap-1 py-16 text-center">
          <p className="text-sm font-content text-foreground/70">
            &apos;{trimmedQuery}&apos;에 대한 검색 결과가 없습니다.
          </p>
          <p className="text-xs font-content text-foreground/50">다른 검색어를 입력해보세요.</p>
        </div>
      )}

      {trimmedQuery && result && result.items.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-foreground/50">총 {result.total}개 결과</p>
          {result.items.map((word) => (
            <WordListItem key={word.id} word={word} highlightQuery={trimmedQuery} />
          ))}

          {result.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => goToQuery(trimmedQuery, page - 1)}
              >
                이전
              </Button>
              <span className="text-sm text-foreground/60">
                {page} / {result.totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= result.totalPages}
                onClick={() => goToQuery(trimmedQuery, page + 1)}
              >
                다음
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

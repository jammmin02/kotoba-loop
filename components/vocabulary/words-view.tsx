"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { PixelBookOpen, PixelPlus, PixelStar } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { TagManagerModal } from "@/components/vocabulary/tag-manager-modal";
import { TagStudyButton } from "@/components/vocabulary/tag-study-button";
import { WordListItem } from "@/components/vocabulary/word-list-item";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
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
          <TagStudyButton
            tagId={tagId}
            tagName={tags?.find((t) => t.id === tagId)?.name ?? ""}
          />
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
          className="h-10 border-2 border-pixel-ink bg-surface px-3 text-sm font-bold text-foreground/70 shadow-bevel-raised transition hover:bg-background"
        >
          태그 관리
        </button>
      </div>

      <TagManagerModal open={tagManagerOpen} onClose={() => setTagManagerOpen(false)} />

      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}

      {isError && (
        <p className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "단어를 불러오지 못했습니다."}
        </p>
      )}

      {words && words.length === 0 && (
        <Card variant="elevated" className="flex flex-col items-center gap-4 py-12 text-center">
          <PixelBookOpen className="size-16 text-primary" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-lg font-bold text-foreground">
              {hasFilters ? "조건에 맞는 단어가 없어요" : "아직 등록된 단어가 없어요"}
            </p>
            <p className="text-sm font-content text-foreground/60">
              첫 단어를 등록하고 학습을 시작해보세요!
            </p>
          </div>
          <Link href={newWordHref}>
            <Button type="button">
              <PixelPlus className="size-4" aria-hidden="true" />
              단어 등록하기
            </Button>
          </Link>
        </Card>
      )}

      {words && words.length > 0 && (
        <div className="flex flex-col gap-3">
          {words.map((word) => (
            <WordListItem key={word.id} word={word} />
          ))}
        </div>
      )}
    </div>
  );
}

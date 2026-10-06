"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { PixelBookOpen, PixelCamera, PixelPlus } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteVocabularyBookModal } from "@/components/vocabulary/delete-vocabulary-book-modal";
import { VocabularyBookCard } from "@/components/vocabulary/vocabulary-book-card";
import { VocabularyBookFormModal } from "@/components/vocabulary/vocabulary-book-form-modal";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "public", label: "공개" },
  { key: "private", label: "비공개" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const FILTER_EMPTY_MESSAGE: Record<Exclude<FilterKey, "all">, string> = {
  public: "공개 단어장이 없어요",
  private: "비공개 단어장이 없어요",
};

export function VocabularyBooksView() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<VocabularyBookSummary | null>(null);
  const [deletingBook, setDeletingBook] = useState<VocabularyBookSummary | null>(null);

  const {
    data: books,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
  });

  // 관리자 숨김(isHidden) 책도 공개 여부는 그대로라 "공개" 탭에 남기고, 카드의 "관리자 숨김" 배지로 구분한다.
  const counts: Record<FilterKey, number> = {
    all: books?.length ?? 0,
    public: books?.filter((b) => b.isPublic).length ?? 0,
    private: books?.filter((b) => !b.isPublic).length ?? 0,
  };
  const visibleBooks = books?.filter((b) =>
    filter === "all" ? true : filter === "public" ? b.isPublic : !b.isPublic,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-foreground">내 단어장</h1>
        <div className="flex gap-2">
          <Link href="/vocabulary/photos/new">
            <Button type="button" variant="outline">
              <PixelCamera className="size-4" aria-hidden="true" />
              사진으로 등록
            </Button>
          </Link>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <PixelPlus className="size-4" aria-hidden="true" />새 단어장
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}

      {isError && (
        <p className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "단어장을 불러오지 못했습니다."}
        </p>
      )}

      {books && books.length === 0 && (
        <Card variant="elevated" className="flex flex-col items-center gap-4 py-12 text-center">
          <PixelBookOpen className="size-16 text-primary" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-lg font-bold text-foreground">아직 단어장이 없어요</p>
            <p className="text-sm font-content text-foreground/60">
              첫 단어장을 만들고 나만의 학습 여정을 시작해보세요!
            </p>
          </div>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <PixelPlus className="size-4" aria-hidden="true" />
            단어장 만들기
          </Button>
        </Card>
      )}

      {books && books.length > 0 && (
        <div className="flex gap-2" role="tablist" aria-label="단어장 공개 여부 필터">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "border-2 px-3 py-1.5 text-sm font-bold transition",
                filter === f.key
                  ? "border-pixel-ink bg-primary text-primary-foreground shadow-bevel-sunken"
                  : "border-pixel-ink bg-surface text-foreground/70 hover:bg-background",
              )}
            >
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
      )}

      {books &&
        books.length > 0 &&
        visibleBooks &&
        visibleBooks.length === 0 &&
        filter !== "all" && (
          <p className="py-8 text-center text-sm font-content text-foreground/60">
            {FILTER_EMPTY_MESSAGE[filter]}
          </p>
        )}

      {visibleBooks && visibleBooks.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleBooks.map((book, index) => (
            <VocabularyBookCard
              key={book.id}
              book={book}
              index={index}
              onEdit={() => setEditingBook(book)}
              onDelete={() => setDeletingBook(book)}
            />
          ))}
        </div>
      )}

      {createOpen && <VocabularyBookFormModal onClose={() => setCreateOpen(false)} />}
      {editingBook && (
        <VocabularyBookFormModal
          key={editingBook.id}
          book={editingBook}
          onClose={() => setEditingBook(null)}
        />
      )}
      {deletingBook && (
        <DeleteVocabularyBookModal
          book={deletingBook}
          open={!!deletingBook}
          onClose={() => setDeletingBook(null)}
        />
      )}
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { PixelGlobe } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { PaginatedResponse } from "@/types/api";
import type { CommunityBookSummary } from "@/types/community";

type Sort = "recent" | "popular";

interface CommunityViewProps {
  initialSort: Sort;
  initialUserId: string;
  initialNickname: string;
}

function formatDate(iso: string) {
  return iso.slice(0, 10).replaceAll("-", ".");
}

export function CommunityView({ initialSort, initialUserId, initialNickname }: CommunityViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sort: Sort = searchParams.get("sort") === "popular" ? "popular" : (initialSort ?? "recent");
  const userId = searchParams.get("userId") ?? initialUserId;
  const nickname = searchParams.get("nickname") ?? initialNickname;
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["community-books", sort, userId, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("sort", sort);
      if (userId) params.set("userId", userId);
      params.set("page", String(page));
      return apiFetch<PaginatedResponse<CommunityBookSummary>>(`/api/vocabulary-books/community?${params}`);
    },
  });

  function goTo(nextSort: Sort, nextPage = 1) {
    const params = new URLSearchParams();
    params.set("sort", nextSort);
    if (userId) {
      params.set("userId", userId);
      if (nickname) params.set("nickname", nickname);
    }
    if (nextPage > 1) params.set("page", String(nextPage));
    router.push(`/my/community?${params}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">커뮤니티 단어장</h1>
        {userId && (
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            <span>{nickname ? `${nickname}님의 공개 단어장` : "필터링된 공개 단어장"}</span>
            <button
              type="button"
              onClick={() => goTo(sort)}
              className="text-xs font-bold text-primary hover:underline"
            >
              전체 보기
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <ChipButton selected={sort === "recent"} onClick={() => goTo("recent")}>
          최신순
        </ChipButton>
        <ChipButton selected={sort === "popular"} onClick={() => goTo("popular")}>
          인기순
        </ChipButton>
      </div>

      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}

      {isError && (
        <p className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "목록을 불러오지 못했습니다."}
        </p>
      )}

      {data && data.items.length === 0 && (
        <Card variant="elevated" className="flex flex-col items-center gap-3 py-12 text-center">
          <PixelGlobe className="size-12 text-foreground/30" aria-hidden="true" />
          <p className="text-sm font-content text-foreground/60">
            아직 공개된 단어장이 없어요.
          </p>
        </Card>
      )}

      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-foreground/50">총 {data.total}개</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((book) => (
              <Link key={book.id} href={`/my/community/${book.id}`}>
                <Card className="flex h-full flex-col gap-2">
                  <p className="truncate text-base font-bold text-foreground">{book.name}</p>
                  <p className="text-xs text-foreground/50">{book.ownerNickname}</p>
                  {book.description && (
                    <p className="line-clamp-2 text-sm font-content text-foreground/60">
                      {book.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-foreground/50">
                    <span>
                      단어 {book.wordCount}개 · 가져감 {book.importCount}회
                    </span>
                    <span>{formatDate(book.createdAt)}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => goTo(sort, page - 1)}
              >
                이전
              </Button>
              <span className="text-sm text-foreground/60">
                {page} / {data.totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= data.totalPages}
                onClick={() => goTo(sort, page + 1)}
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

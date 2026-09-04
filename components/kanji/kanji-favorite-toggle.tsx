"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PixelStar } from "@/components/icons/pixel-icons";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface KanjiFavoriteToggleProps {
  character: string;
  isFavorite: boolean;
  className?: string;
}

/** `components/vocabulary/favorite-button.tsx`의 한자판 — 대상 id 대신 한자 문자로 호출한다
 *  (`GET /api/kanji`류가 전부 `character`를 공개 식별자로 쓰는 것과 같은 이유). */
export function KanjiFavoriteToggle({ character, isFavorite, className }: KanjiFavoriteToggleProps) {
  const [favorite, setFavorite] = useState(isFavorite);
  const [prevIsFavorite, setPrevIsFavorite] = useState(isFavorite);
  if (isFavorite !== prevIsFavorite) {
    setPrevIsFavorite(isFavorite);
    setFavorite(isFavorite);
  }
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (next: boolean) =>
      apiFetch(`/api/kanji/${encodeURIComponent(character)}/favorite`, {
        method: next ? "POST" : "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanji", "practice-pool"] });
    },
    onError: (err, next) => {
      setFavorite(!next);
      toast.error(err instanceof ApiClientError ? err.message : "즐겨찾기 변경에 실패했습니다.");
    },
  });

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !favorite;
    setFavorite(next);
    mutation.mutate(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorite}
      aria-label={favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      className={cn(
        "flex shrink-0 items-center justify-center transition hover:scale-110",
        favorite ? "text-warning" : "text-foreground/25 hover:text-foreground/50",
        className,
      )}
    >
      <PixelStar className="size-3.5" aria-hidden="true" />
    </button>
  );
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PixelStar } from "@/components/icons/pixel-icons";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  vocabularyId: string;
  isFavorite: boolean;
  className?: string;
}

export function FavoriteButton({ vocabularyId, isFavorite, className }: FavoriteButtonProps) {
  const [favorite, setFavorite] = useState(isFavorite);
  const [prevIsFavorite, setPrevIsFavorite] = useState(isFavorite);
  if (isFavorite !== prevIsFavorite) {
    setPrevIsFavorite(isFavorite);
    setFavorite(isFavorite);
  }
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (next: boolean) =>
      apiFetch(`/api/vocabularies/${vocabularyId}/favorite`, { method: next ? "POST" : "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
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
      <PixelStar className="size-5" aria-hidden="true" />
    </button>
  );
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { PixelPlus } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

export function ImportBookButton({ bookId }: { bookId: string }) {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<VocabularyBookSummary>(`/api/vocabulary-books/community/${bookId}/import`, {
        method: "POST",
      }),
    onSuccess: (book) => {
      toast.success(`"${book.name}" 단어장을 내 단어장에 추가했습니다.`);
      router.push("/vocabulary");
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "가져오기 중 오류가 발생했습니다.");
    },
  });

  return (
    <Button type="button" onClick={() => mutation.mutate()} loading={mutation.isPending}>
      <PixelPlus className="size-4" aria-hidden="true" />
      내 단어장에 가져오기
    </Button>
  );
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

interface DeleteVocabularyBookModalProps {
  book: VocabularyBookSummary;
  open: boolean;
  onClose: () => void;
}

export function DeleteVocabularyBookModal({ book, open, onClose }: DeleteVocabularyBookModalProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => apiFetch(`/api/vocabulary-books/${book.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
      toast.success("단어장을 삭제했습니다.");
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "삭제 중 오류가 발생했습니다.");
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="단어장 삭제">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-foreground">
          <span className="font-bold">{book.name}</span> 단어장을 삭제할까요?
        </p>
        {book.wordCount > 0 && (
          <p className="text-xs text-foreground/60">
            이 단어장에 담긴 단어 {book.wordCount}개는 삭제되지 않아요. 단어장 소속만 해제되고, 단어
            자체와 학습 기록은 그대로 남습니다.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
          >
            삭제
          </Button>
        </div>
      </div>
    </Modal>
  );
}

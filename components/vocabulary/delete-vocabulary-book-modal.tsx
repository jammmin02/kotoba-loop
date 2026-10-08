"use client";

import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { scheduleBookDeletion, UNDO_WINDOW_MS } from "@/lib/pending-deletion/actions";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

interface DeleteVocabularyBookModalProps {
  book: VocabularyBookSummary;
  open: boolean;
  onClose: () => void;
}

export function DeleteVocabularyBookModal({ book, open, onClose }: DeleteVocabularyBookModalProps) {
  const queryClient = useQueryClient();

  function handleDelete() {
    scheduleBookDeletion({ bookId: book.id, name: book.name, queryClient });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="단어장 삭제">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-foreground">
          <span className="font-bold">{book.name}</span> 단어장을 삭제할까요?
        </p>
        {book.wordCount > 0 && (
          <p className="text-xs text-muted">
            이 단어장에 담긴 단어 {book.wordCount}개는 삭제되지 않아요. 단어장 소속만 해제되고, 단어
            자체와 학습 기록은 그대로 남습니다.
          </p>
        )}
        <p className="text-xs text-muted">
          삭제 후 {UNDO_WINDOW_MS / 1000}초 안에는 &apos;실행 취소&apos;로 되돌릴 수 있어요.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete}>
            삭제
          </Button>
        </div>
      </div>
    </Modal>
  );
}

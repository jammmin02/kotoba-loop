"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import {
  VOCABULARY_BOOK_DESCRIPTION_MAX,
  VOCABULARY_BOOK_NAME_MAX,
  createVocabularyBookSchema,
} from "@/lib/validations/vocabulary-book";
import type { CreateVocabularyBookInput } from "@/lib/validations/vocabulary-book";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

import type { FormEvent } from "react";

interface VocabularyBookFormModalProps {
  onClose: () => void;
  /** When provided, the modal edits this book instead of creating a new one. Mount with a
   *  `key` tied to the book (or unmount/remount on open) so field state starts fresh. */
  book?: VocabularyBookSummary;
}

export function VocabularyBookFormModal({ onClose, book }: VocabularyBookFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!book;
  const [name, setName] = useState(book?.name ?? "");
  const [description, setDescription] = useState(book?.description ?? "");
  const [isPublic, setIsPublic] = useState(book?.isPublic ?? false);
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: (payload: CreateVocabularyBookInput) =>
      isEdit
        ? apiFetch<VocabularyBookSummary>(`/api/vocabulary-books/${book.id}`, {
            method: "PATCH",
            body: payload,
          })
        : apiFetch<VocabularyBookSummary>("/api/vocabulary-books", {
            method: "POST",
            body: payload,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
      toast.success(isEdit ? "단어장을 수정했습니다." : "단어장을 만들었습니다.");
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : "저장 중 오류가 발생했습니다.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);

    const parsed = createVocabularyBookSchema.safeParse({ name, description, isPublic });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }

    mutation.mutate(parsed.data);
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? "단어장 수정" : "새 단어장"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={VOCABULARY_BOOK_NAME_MAX}
          required
        />
        <Textarea
          label="설명"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={VOCABULARY_BOOK_DESCRIPTION_MAX}
          helperText="선택 사항이에요."
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">공개 여부</span>
          <div className="flex gap-2">
            <ChipButton selected={!isPublic} onClick={() => setIsPublic(false)} className="flex-1">
              비공개
            </ChipButton>
            <ChipButton selected={isPublic} onClick={() => setIsPublic(true)} className="flex-1">
              공개
            </ChipButton>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEdit ? "저장" : "만들기"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { RemoveWordsResponse } from "@/app/api/vocabulary-books/[id]/remove-words/route";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";

export interface DeleteWordButtonProps {
  id: string;
  word: string;
  /**
   * 단어장에서 열었을 때의 그 단어장 id. 있으면 이 단어장에서만 빼고(다른 단어장에도 없을 때만
   * 단어 자체를 삭제), 없으면(전체 단어 목록에서 열었을 때) 단어 자체를 삭제한다.
   */
  bookId?: string;
}

export function DeleteWordButton({ id, word, bookId }: DeleteWordButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (bookId) {
        return apiFetch<RemoveWordsResponse>(`/api/vocabulary-books/${bookId}/remove-words`, {
          method: "POST",
          body: { ids: [id] },
        });
      }
      await apiFetch(`/api/vocabularies/${id}`, { method: "DELETE" });
      return null;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
      toast.success(
        result && result.deletedCount === 0 ? "이 단어장에서 뺐습니다." : "단어를 삭제했습니다.",
      );
      router.push(bookId ? `/vocabulary/${bookId}` : "/words");
      router.refresh();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "삭제 중 오류가 발생했습니다.");
    },
  });

  return (
    <>
      <Button type="button" variant="danger" size="sm" onClick={() => setOpen(true)}>
        삭제
      </Button>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="단어 삭제">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground">
              <span className="font-bold">{word}</span>{" "}
              {bookId
                ? "단어를 이 단어장에서 삭제할까요? 다른 단어장에도 있으면 그쪽에 그대로 남고, 어느 단어장에도 없게 되면 뜻·예문·학습 기록까지 완전히 삭제돼요."
                : "단어를 삭제할까요? 등록된 뜻과 예문도 함께 삭제되고, 모든 단어장에서 사라져요."}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
      )}
    </>
  );
}

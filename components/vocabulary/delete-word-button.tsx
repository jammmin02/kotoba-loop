"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";

export function DeleteWordButton({ id, word }: { id: string; word: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => apiFetch(`/api/vocabularies/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
      toast.success("단어를 삭제했습니다.");
      router.push("/words");
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
              <span className="font-bold">{word}</span> 단어를 삭제할까요? 등록된 뜻과 예문도 함께
              삭제됩니다.
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

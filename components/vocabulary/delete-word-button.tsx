"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { scheduleWordDeletion, UNDO_WINDOW_MS } from "@/lib/pending-deletion/actions";

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

  // 서버에는 바로 보내지 않고 취소 시간(UNDO_WINDOW_MS)이 지난 뒤에 보낸다 — 그 안에는 토스트의
  // "실행 취소"로 되돌릴 수 있다. 목록에서는 즉시 사라진 것처럼 보인다.
  function handleDelete() {
    scheduleWordDeletion({ wordId: id, word, bookId, queryClient });
    setOpen(false);
    router.push(bookId ? `/vocabulary/${bookId}` : "/words");
  }

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
            <p className="text-xs text-muted">
              삭제 후 {UNDO_WINDOW_MS / 1000}초 안에는 &apos;실행 취소&apos;로 되돌릴 수 있어요.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                취소
              </Button>
              <Button type="button" variant="danger" onClick={handleDelete}>
                삭제
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

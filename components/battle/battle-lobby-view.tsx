"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { BattleRoomState } from "@/types/battle";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

const ROOM_CODE_LENGTH = 6;

function CreateRoomModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const booksQuery = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (vocabularyBookId: string) =>
      apiFetch<BattleRoomState>("/api/battle-rooms", {
        method: "POST",
        body: { vocabularyBookId },
      }),
    onSuccess: (room) => router.push(`/study/battle/${room.roomCode}`),
  });

  return (
    <Modal open={open} onClose={onClose} title="방 만들기">
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-foreground">대결에 쓸 단어장을 골라주세요</p>
        {booksQuery.isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}
        {booksQuery.data?.length === 0 && (
          <p className="text-sm text-foreground/60">등록된 단어장이 없어요.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {booksQuery.data?.map((book) => (
            <ChipButton
              key={book.id}
              selected={selectedBookId === book.id}
              onClick={() => setSelectedBookId(book.id)}
            >
              {book.name} ({book.wordCount})
            </ChipButton>
          ))}
        </div>

        {createMutation.isError && (
          <p className="text-xs text-error">
            {createMutation.error instanceof ApiClientError
              ? createMutation.error.message
              : "방을 만들지 못했습니다."}
          </p>
        )}

        <Button
          type="button"
          variant="quest"
          size="lg"
          disabled={!selectedBookId}
          loading={createMutation.isPending}
          onClick={() => selectedBookId && createMutation.mutate(selectedBookId)}
        >
          방 만들기
        </Button>
      </div>
    </Modal>
  );
}

function JoinRoomModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");

  const joinMutation = useMutation({
    mutationFn: (code: string) =>
      apiFetch<BattleRoomState>(`/api/battle-rooms/${code}/join`, { method: "POST" }),
    onSuccess: (room) => router.push(`/study/battle/${room.roomCode}`),
  });

  const normalizedCode = roomCode.trim().toUpperCase();

  return (
    <Modal open={open} onClose={onClose} title="방 참가하기">
      <div className="flex flex-col gap-4">
        <Input
          label="방 코드"
          value={roomCode}
          maxLength={ROOM_CODE_LENGTH}
          placeholder="예: A3F9K2"
          onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
          className="text-center font-mono text-lg tracking-widest"
          error={
            joinMutation.isError
              ? joinMutation.error instanceof ApiClientError
                ? joinMutation.error.message
                : "참가하지 못했습니다."
              : undefined
          }
        />
        <Button
          type="button"
          variant="quest"
          size="lg"
          disabled={normalizedCode.length !== ROOM_CODE_LENGTH}
          loading={joinMutation.isPending}
          onClick={() => joinMutation.mutate(normalizedCode)}
        >
          참가하기
        </Button>
      </div>
    </Modal>
  );
}

export function BattleLobbyView() {
  const [modal, setModal] = useState<"create" | "join" | null>(null);

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <Button type="button" variant="quest" size="lg" onClick={() => setModal("create")}>
        방 만들기
      </Button>
      <Button type="button" variant="outline" size="lg" onClick={() => setModal("join")}>
        방 참가하기
      </Button>

      <CreateRoomModal open={modal === "create"} onClose={() => setModal(null)} />
      <JoinRoomModal open={modal === "join"} onClose={() => setModal(null)} />
    </div>
  );
}

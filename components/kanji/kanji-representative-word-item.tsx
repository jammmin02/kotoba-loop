"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { achievementToast } from "@/components/game/achievement-toast";
import { JlptBadge } from "@/components/ui/badge";
import type { JlptLevel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StampedChipButton } from "@/components/ui/stamped-chip-button";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { AddToBookResult } from "@/types/vocabulary";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

export interface KanjiRepresentativeWord {
  id: string;
  word: string;
  reading: string;
  meanings: string[];
  jlptLevel: JlptLevel | null;
}

/**
 * DB 사전 데이터를 그대로 보여주는 대표 단어 항목 — 사용자가 아직 단어장에 등록하지
 * 않았을 수 있어 WordListItem과 달리 /words/[id] 링크나 즐겨찾기 버튼을 두지 않는다
 * (둘 다 UserVocabulary 소유를 전제로 한다). 대신 이미 내 단어장에 있는지(`isOwned`)만
 * 알려주면 되고, 없으면 "단어장에 추가" 버튼으로 (다시 만들지 않고) 이 Vocabulary를
 * 그대로 연결할 수 있다.
 */
export function KanjiRepresentativeWordItem({
  word,
  isOwned,
}: {
  word: KanjiRepresentativeWord;
  isOwned: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [added, setAdded] = useState(isOwned);

  return (
    <div className="flex items-center justify-between gap-3 border-2 border-pixel-ink bg-background p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="font-jp text-lg font-bold text-foreground">{word.word}</span>
          <span className="font-jp text-sm text-foreground/60">{word.reading}</span>
        </div>
        <p className="truncate text-sm font-content text-foreground/60">
          {word.meanings.join(", ")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {word.jlptLevel && <JlptBadge level={word.jlptLevel} />}
        {added ? (
          <span className="text-xs font-bold text-foreground/40">단어장에 있음</span>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => setModalOpen(true)}>
            + 단어장에 추가
          </Button>
        )}
      </div>

      {modalOpen && (
        <AddToBookModal
          vocabularyId={word.id}
          onClose={() => setModalOpen(false)}
          onAdded={() => {
            setAdded(true);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AddToBookModal({
  vocabularyId,
  onClose,
  onAdded,
}: {
  vocabularyId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: books, isLoading } = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<AddToBookResult>(`/api/vocabularies/${vocabularyId}/add-to-book`, {
        method: "POST",
        body: { vocabularyBookIds: selectedBookIds },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
      toast.success("단어장에 추가했어요.");
      result.unlockedAchievements.forEach((achievement) => achievementToast.show(achievement.title));
      router.refresh();
      onAdded();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "단어장 추가에 실패했습니다.");
    },
  });

  function toggleBook(bookId: string) {
    setSelectedBookIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId],
    );
  }

  return (
    <Modal open onClose={onClose} title="단어장에 추가">
      <div className="flex flex-col gap-4">
        {isLoading && <p className="text-sm text-foreground/60">단어장을 불러오는 중...</p>}
        {books && books.length === 0 && (
          <p className="text-sm text-foreground/60">
            먼저 단어장을 만들어주세요.{" "}
            <Link href="/vocabulary" className="font-bold text-primary hover:underline">
              단어장 만들러 가기
            </Link>
          </p>
        )}
        {books && books.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-1">
            {books.map((book, index) => (
              <StampedChipButton
                key={book.id}
                selected={selectedBookIds.includes(book.id)}
                colorIndex={index}
                onClick={() => toggleBook(book.id)}
              >
                {book.name}
              </StampedChipButton>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            type="button"
            disabled={selectedBookIds.length === 0}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            추가
          </Button>
        </div>
      </div>
    </Modal>
  );
}

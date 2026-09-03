"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { FlashcardSession } from "@/components/study/flashcard-session";
import { QUIZ_TYPE_LABELS, QuizSession } from "@/components/study/quiz-session";
import { Button } from "@/components/ui/button";
import { Card, cardVariants } from "@/components/ui/card";
import { StampedChipButton } from "@/components/ui/stamped-chip-button";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { QuizType } from "@/lib/quiz/types";
import { VOCAB_QUIZ_TYPES } from "@/lib/quiz/types";
import { cn } from "@/lib/utils";
import type { SessionCard } from "@/types/study";
import type { VocabularySummary } from "@/types/vocabulary";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

type GameMode = "flashcard" | "quiz";

function toSessionCard(word: VocabularySummary): SessionCard {
  return {
    vocabularyId: word.id,
    word: word.word,
    reading: word.reading,
    meanings: word.meanings,
    // `GET /api/vocabularies`는 예문을 포함하지 않는다 — 뒷면에는 뜻까지만 표시된다.
    examples: [],
  };
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}

function toggleQuizType(types: QuizType[], type: QuizType): QuizType[] {
  return types.includes(type) ? types.filter((existing) => existing !== type) : [...types, type];
}

/** 학습 세션이 시작된 뒤 선택 값이 바뀌어도 세션 도중 문제 구성이 흔들리지 않도록 얼린 스냅샷. */
interface StartedSession {
  bookIds: string[];
  gameMode: GameMode;
  quizTypes: QuizType[];
}

function SessionRunner({ session, onExit }: { session: StartedSession; onExit: () => void }) {
  const vocabQuery = useQuery({
    queryKey: ["vocabularies", "custom", session.bookIds],
    queryFn: () =>
      apiFetch<VocabularySummary[]>(`/api/vocabularies?bookIds=${session.bookIds.join(",")}`),
  });

  if (vocabQuery.isLoading) {
    return <p className="text-sm text-foreground/60">불러오는 중...</p>;
  }

  if (vocabQuery.isError) {
    return (
      <p className="text-sm text-error">
        {vocabQuery.error instanceof ApiClientError
          ? vocabQuery.error.message
          : "단어를 불러오지 못했습니다."}
      </p>
    );
  }

  const words = vocabQuery.data ?? [];

  if (words.length === 0) {
    return (
      <div
        className={cn(
          cardVariants({ variant: "elevated" }),
          "flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center",
        )}
      >
        <p className="text-lg font-bold text-foreground">선택한 단어장에 단어가 없어요</p>
        <Button type="button" variant="outline" onClick={onExit}>
          다시 고르기
        </Button>
      </div>
    );
  }

  if (session.gameMode === "flashcard") {
    return (
      <FlashcardSession key="custom-flashcards" mode="custom" queue={words.map(toSessionCard)} />
    );
  }

  return (
    <QuizSession
      key="custom-quiz"
      targetIds={words.map((word) => word.id)}
      quizTypes={session.quizTypes}
      returnHref="/study/custom"
      returnLabel="커스텀 학습으로 돌아가기"
    />
  );
}

export interface CustomStudyViewProps {
  /** 단어 상세의 "복습하기" 진입 등에서 넘어올 때 STEP 1의 단어장 선택을 미리 채워준다. */
  initialBookId?: string;
}

export function CustomStudyView({ initialBookId }: CustomStudyViewProps = {}) {
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(
    initialBookId ? [initialBookId] : [],
  );
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [selectedQuizTypes, setSelectedQuizTypes] = useState<QuizType[]>([]);
  const [session, setSession] = useState<StartedSession | null>(null);

  const booksQuery = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
  });

  if (session) {
    return <SessionRunner session={session} onExit={() => setSession(null)} />;
  }

  const canStart =
    selectedBookIds.length > 0 &&
    (gameMode === "flashcard" || (gameMode === "quiz" && selectedQuizTypes.length > 0));

  function handleStart() {
    if (!gameMode || !canStart) return;
    setSession({ bookIds: selectedBookIds, gameMode, quizTypes: selectedQuizTypes });
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Card variant="elevated" title="STEP 1" className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground">
          학습할 단어장을 골라주세요 (복수 선택 가능)
        </p>
        {booksQuery.isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}
        {booksQuery.isError && (
          <p className="text-sm text-error">단어장 목록을 불러오지 못했습니다.</p>
        )}
        {booksQuery.data && booksQuery.data.length === 0 && (
          <p className="text-sm text-foreground/60">등록된 단어장이 없어요.</p>
        )}
        <div className="flex flex-wrap gap-3 pt-1">
          {booksQuery.data?.map((book, index) => (
            <StampedChipButton
              key={book.id}
              selected={selectedBookIds.includes(book.id)}
              colorIndex={index}
              onClick={() => setSelectedBookIds((ids) => toggleId(ids, book.id))}
            >
              {book.name} ({book.wordCount})
            </StampedChipButton>
          ))}
        </div>
      </Card>

      <Card variant="elevated" title="STEP 2" className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground">어떤 방식으로 학습할까요?</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <StampedChipButton
            selected={gameMode === "flashcard"}
            colorIndex={0}
            onClick={() => setGameMode("flashcard")}
          >
            플래시카드
          </StampedChipButton>
          <StampedChipButton
            selected={gameMode === "quiz"}
            colorIndex={1}
            onClick={() => setGameMode("quiz")}
          >
            퀴즈
          </StampedChipButton>
        </div>

        {gameMode === "quiz" && (
          <div className="flex flex-col gap-2 border-t-2 border-pixel-ink pt-3">
            <p className="text-sm font-bold text-foreground">
              퀴즈 유형을 골라주세요 (복수 선택 가능)
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {VOCAB_QUIZ_TYPES.map((quizType, index) => (
                <StampedChipButton
                  key={quizType}
                  selected={selectedQuizTypes.includes(quizType)}
                  colorIndex={index}
                  onClick={() => setSelectedQuizTypes((types) => toggleQuizType(types, quizType))}
                >
                  {QUIZ_TYPE_LABELS[quizType]}
                </StampedChipButton>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Button type="button" variant="quest" size="lg" disabled={!canStart} onClick={handleStart}>
        학습 시작
      </Button>
    </div>
  );
}

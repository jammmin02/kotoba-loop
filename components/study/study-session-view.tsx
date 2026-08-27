"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { FlashcardSession } from "@/components/study/flashcard-session";
import { QuizSession } from "@/components/study/quiz-session";
import { buttonVariants } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/card";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { toKstDateKey } from "@/lib/datetime";
import { buildTodayOverrideQueryString, useTodayPlanOverride } from "@/lib/stores/exam-plan-store";
import { cn } from "@/lib/utils";
import type { SessionCard, StudyQueueResponse } from "@/types/study";
import type { VocabularySummary } from "@/types/vocabulary";

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

export interface StudySessionViewProps {
  tagId?: string;
  tagName?: string;
}

export function StudySessionView({ tagId, tagName }: StudySessionViewProps) {
  const isTagMode = !!tagId;
  // "새 단어(플래시카드) → 복습/오답(퀴즈)" 순서(계획서 3.1)를 이 화면이 오케스트레이션한다.
  // 새 단어가 없으면(아래 `showQuiz`) 바로 퀴즈로 시작하고, 있으면 플래시카드 완료 후 넘어간다.
  const [phase, setPhase] = useState<"flashcards" | "quiz">("flashcards");

  const override = useTodayPlanOverride(toKstDateKey(new Date()));
  const todayQuery = useQuery({
    queryKey: ["study", "queue", override],
    queryFn: () => apiFetch<StudyQueueResponse>(`/api/study/queue${buildTodayOverrideQueryString(override)}`),
    enabled: !isTagMode,
  });

  const tagQuery = useQuery({
    queryKey: ["vocabularies", "tag", tagId],
    queryFn: () => apiFetch<VocabularySummary[]>(`/api/vocabularies?tagId=${tagId}`),
    enabled: isTagMode,
  });

  // `todayQuery.data`(react-query가 재조회 전까지 안정적으로 유지하는 참조)에 대해서만
  // 메모이즈한다 — 그래야 매 렌더마다 새 배열이 만들어져 QuizSession의 useEffect가
  // 불필요하게 재실행되지 않는다.
  const items = useMemo(() => todayQuery.data?.items ?? [], [todayQuery.data]);
  const flashcardItems = useMemo(
    () => items.filter((item) => item.category === "newWords"),
    [items],
  );
  const quizVocabularyIds = useMemo(
    () => items.filter((item) => item.category !== "newWords").map((item) => item.vocabularyId),
    [items],
  );

  const isLoading = isTagMode ? tagQuery.isLoading : todayQuery.isLoading;
  const isError = isTagMode ? tagQuery.isError : todayQuery.isError;
  const error = isTagMode ? tagQuery.error : todayQuery.error;

  if (isLoading) {
    return <p className="text-sm text-foreground/60">불러오는 중...</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-error">
        {error instanceof ApiClientError ? error.message : "학습 큐를 불러오지 못했습니다."}
      </p>
    );
  }

  if (isTagMode) {
    const queue = (tagQuery.data ?? []).map(toSessionCard);
    if (queue.length === 0) {
      return (
        <div
          className={cn(
            cardVariants({ variant: "elevated" }),
            "flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center",
          )}
        >
          <p className="text-lg font-bold text-foreground">이 태그에 학습할 단어가 없어요</p>
          <Link href="/words" className={cn(buttonVariants({ variant: "outline" }))}>
            단어 목록으로
          </Link>
        </div>
      );
    }
    return <FlashcardSession key={`tag-${tagId}`} mode="tag" queue={queue} tagName={tagName} />;
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          cardVariants({ variant: "elevated" }),
          "flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center",
        )}
      >
        <p className="text-lg font-bold text-foreground">오늘 학습할 카드가 없어요</p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          오늘의 학습으로
        </Link>
      </div>
    );
  }

  const showQuiz = phase === "quiz" || flashcardItems.length === 0;

  if (!showQuiz) {
    return (
      <FlashcardSession
        key="today-flashcards"
        mode="today"
        queue={flashcardItems}
        onComplete={quizVocabularyIds.length > 0 ? () => setPhase("quiz") : undefined}
      />
    );
  }

  return <QuizSession key="today-quiz" targetIds={quizVocabularyIds} />;
}

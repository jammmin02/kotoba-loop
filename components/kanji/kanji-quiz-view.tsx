"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { QuizSession } from "@/components/study/quiz-session";
import { buttonVariants } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/card";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { KanjiQuizQueueResponse } from "@/types/kanji";

/**
 * "오늘의 한자"(PROMPT 36) 전용 화면 — `StudySessionView`가 `/api/study/queue`를 불러와
 * `QuizSession`에 넘기는 것과 같은 패턴으로, `/api/kanji/quiz-queue`를 불러와 같은
 * `QuizSession`을 한자 대상으로 재사용한다(새 퀴즈 화면이 아니라 큐 공급 래퍼만 새로 추가).
 */
export function KanjiQuizView() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["kanji", "quiz-queue"],
    queryFn: () => apiFetch<KanjiQuizQueueResponse>("/api/kanji/quiz-queue"),
  });

  if (isLoading) {
    return <p className="text-sm text-foreground/60">불러오는 중...</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-error">
        {error instanceof ApiClientError ? error.message : "오늘의 한자를 불러오지 못했습니다."}
      </p>
    );
  }

  const kanjiIds = data?.kanjiIds ?? [];

  if (kanjiIds.length === 0) {
    return (
      <div
        className={cn(
          cardVariants({ variant: "elevated" }),
          "flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center",
        )}
      >
        <p className="text-lg font-bold text-foreground">오늘 풀 한자가 없어요</p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          오늘의 학습으로
        </Link>
      </div>
    );
  }

  return (
    <QuizSession
      key="kanji-quiz"
      targetIds={kanjiIds}
      targetType="kanji"
      returnHref="/"
      returnLabel="오늘의 학습으로 돌아가기"
    />
  );
}

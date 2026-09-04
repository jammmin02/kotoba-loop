"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PixelSparkles } from "@/components/icons/pixel-icons";
import { QuizSession } from "@/components/study/quiz-session";
import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, cardVariants } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { WrongNoteItem, WrongNotePeriod, WrongNotesResponse } from "@/types/wrong-note";

const WRONG_NOTE_PERIOD_OPTIONS: WrongNotePeriod[] = ["week", "all"];

const PERIOD_LABELS: Record<WrongNotePeriod, string> = {
  week: "이번 주",
  all: "전체",
};

function formatDate(iso: string) {
  return iso.slice(0, 10).replaceAll("-", ".");
}

function WrongNoteRow({ item }: { item: WrongNoteItem }) {
  return (
    <Card className="flex flex-col gap-2 transition hover:bg-background">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/words/${item.vocabularyId}`}
          className="flex min-w-0 flex-1 flex-col gap-1"
        >
          <div className="flex items-baseline gap-2">
            <span className="font-jp text-lg font-bold text-foreground">{item.word}</span>
            <span className="font-jp text-sm text-foreground/60">{item.reading}</span>
          </div>
          <p className="truncate text-sm font-content text-foreground/60">
            {item.meanings.join(", ")}
          </p>
        </Link>
        <StatusBadge status={item.learningStatus} className="shrink-0" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-1 border-t-2 border-pixel-ink pt-2 text-xs text-foreground/60">
        <span>
          총 {item.totalCount}문제 · 정답 {item.correctCount} · 오답{" "}
          <span className="font-bold text-error">{item.wrongCount}</span> · 정답률{" "}
          {item.accuracyRate}%
        </span>
        <span>최근 오답 {formatDate(item.lastWrongAt)}</span>
      </div>
    </Card>
  );
}

export function WrongNotesView() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<WrongNotePeriod>("week");
  const [isRetesting, setIsRetesting] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["wrong-notes", period],
    queryFn: () => apiFetch<WrongNotesResponse>(`/api/wrong-notes?period=${period}`),
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const vocabularyIds = useMemo(() => items.map((item) => item.vocabularyId), [items]);

  function handleExitRetest() {
    // 재시험 결과(정답률/오답 수 등)가 그대로 이 목록에 반영되도록, 목록으로 돌아갈 때
    // 캐시된 오답노트 조회를 무효화해 다시 불러온다.
    queryClient.invalidateQueries({ queryKey: ["wrong-notes"] });
    setIsRetesting(false);
  }

  if (isRetesting) {
    return (
      <QuizSession
        key={`wrong-notes-quiz-${period}`}
        targetIds={vocabularyIds}
        returnLabel="오답노트로 돌아가기"
        onExit={handleExitRetest}
      />
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-extrabold text-foreground">오답노트</h1>
        <div className="flex gap-1.5">
          {WRONG_NOTE_PERIOD_OPTIONS.map((key) => (
            <ChipButton key={key} selected={period === key} onClick={() => setPeriod(key)}>
              {PERIOD_LABELS[key]}
            </ChipButton>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-foreground/60">불러오는 중...</p>
      ) : isError ? (
        <p className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "오답노트를 불러오지 못했습니다."}
        </p>
      ) : items.length === 0 ? (
        <div
          className={cn(
            cardVariants({ variant: "elevated" }),
            "flex flex-col items-center gap-3 p-8 text-center",
          )}
        >
          <p className="text-lg font-bold text-foreground">
            {period === "week" ? "이번 주 오답이 없어요!" : "오답이 없어요!"}
          </p>
          <p className="text-sm font-content text-foreground/60">
            꾸준히 학습하고 있네요. 이대로 계속해봐요.
          </p>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            오늘의 학습으로
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.vocabularyId}>
                <WrongNoteRow item={item} />
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="quest"
            size="lg"
            className="w-full"
            onClick={() => setIsRetesting(true)}
          >
            <PixelSparkles className="size-5" aria-hidden="true" />
            오답 재시험 시작 ({items.length})
          </Button>
        </>
      )}
    </div>
  );
}

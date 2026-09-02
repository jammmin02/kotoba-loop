"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { ProgressRing } from "@/components/game/progress-ring";
import {
  PixelBookOpen,
  PixelCheck,
  PixelPlus,
  PixelSparkles,
} from "@/components/icons/pixel-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { toKstDateKey } from "@/lib/datetime";
import { buildTodayOverrideQueryString, useTodayPlanOverride } from "@/lib/stores/exam-plan-store";
import { cn } from "@/lib/utils";
import type { TodaySummaryResponse } from "@/types/study";

export function TodaySummaryView() {
  const override = useTodayPlanOverride(toKstDateKey(new Date()));
  const {
    data: summary,
    isLoading,
    isError,
    error,
  } = useQuery({
    // override 값이 바뀌면(적용 직후) 반드시 새 쿼리로 취급해 다시 불러온다.
    queryKey: ["study", "today-summary", override],
    queryFn: () =>
      apiFetch<TodaySummaryResponse>(
        `/api/study/today-summary${buildTodayOverrideQueryString(override)}`,
      ),
  });

  if (isLoading) {
    return <p className="text-sm text-foreground/60">불러오는 중...</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-error">
        {error instanceof ApiClientError ? error.message : "오늘의 학습을 불러오지 못했습니다."}
      </p>
    );
  }

  if (!summary) return null;

  const isEmpty = summary.totalCount === 0 && !summary.hasAnyVocabulary;
  const isDone = summary.totalCount === 0 && summary.hasAnyVocabulary;
  const progressMax = summary.completedToday + summary.totalCount;

  return (
    <Card
      variant="elevated"
      title="TODAY.EXE"
      className="flex w-full max-w-md flex-col items-center gap-6 text-center"
    >
      <ProgressRing
        value={summary.completedToday}
        max={progressMax}
        label="오늘의 진행도"
        size={120}
      />

      {isEmpty ? (
        <div className="flex flex-col items-center gap-3">
          <PixelBookOpen className="size-12 text-primary" aria-hidden="true" />
          <p className="text-lg font-bold text-foreground">아직 등록된 단어가 없어요</p>
          <p className="text-sm font-content text-foreground/60">
            첫 단어를 등록하고 오늘의 학습을 시작해보세요!
          </p>
          <Link href="/words/new">
            <Button type="button">
              <PixelPlus className="size-4" aria-hidden="true" />
              단어 등록하기
            </Button>
          </Link>
        </div>
      ) : isDone ? (
        <div className="flex flex-col items-center gap-3">
          <PixelCheck className="size-12 text-success" aria-hidden="true" />
          <p className="text-lg font-bold text-foreground">오늘 학습을 모두 마쳤어요!</p>
          <p className="text-sm font-content text-foreground/60">
            내일 또 새로운 단어와 복습이 기다리고 있어요. 잠시 쉬어가세요.
          </p>
        </div>
      ) : (
        <>
          <ul className="flex w-full flex-col gap-2 text-left">
            {summary.categories
              .filter((category) => category.count > 0)
              .map((category) => {
                const rowContent = (
                  <>
                    <span className="text-sm font-bold text-foreground">{category.label}</span>
                    <span className="text-sm font-bold text-foreground/70">{category.count}개</span>
                  </>
                );
                // "오답 복습" 단계는 오늘의 퀴즈에 섞여 들어가는 것과 별개로, 단어별 오답
                // 통계를 모아보는 오답노트(PROMPT 21)로도 진입할 수 있어야 한다.
                if (category.key === "weak") {
                  return (
                    <li key={category.key}>
                      <Link
                        href="/wrong-notes"
                        className="flex items-center justify-between border-2 border-pixel-ink bg-background px-3 py-2 transition hover:bg-surface"
                      >
                        {rowContent}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li
                    key={category.key}
                    className="flex items-center justify-between border-2 border-pixel-ink bg-background px-3 py-2"
                  >
                    {rowContent}
                  </li>
                );
              })}
          </ul>

          <div className="flex w-full flex-col gap-1 border-t-2 border-pixel-ink pt-4">
            <div className="flex items-center justify-between text-base font-extrabold text-foreground">
              <span>총 학습</span>
              <span>{summary.totalCount}개</span>
            </div>
            <p className="text-xs text-foreground/60">
              예상 소요 시간 {summary.estimatedTimeLabel}
            </p>
          </div>

          <Link
            href="/study/session"
            className={cn(buttonVariants({ variant: "quest", size: "lg" }), "w-full")}
          >
            <PixelSparkles className="size-5" aria-hidden="true" />
            오늘 공부 시작
          </Link>
        </>
      )}

      {/* 단어 학습이 비어있거나(isEmpty) 오늘 몫을 다 마쳤어도(isDone) "오늘의 한자"는 별개
       * 큐라 계속 남아있을 수 있다 — 위 단어 전용 분기 안에 두면 단어 학습이 끝나는 순간
       * 유일한 진입점이 함께 사라져버리므로, 세 분기 모두에 걸쳐 항상 노출한다. */}
      {summary.todayKanjiCount > 0 && (
        <Link
          href="/kanji/quiz"
          className="flex w-full items-center justify-between border-2 border-pixel-ink bg-background px-3 py-2 transition hover:bg-surface"
        >
          <span className="text-sm font-bold text-foreground">오늘의 한자</span>
          <span className="text-sm font-bold text-foreground/70">{summary.todayKanjiCount}자</span>
        </Link>
      )}
    </Card>
  );
}

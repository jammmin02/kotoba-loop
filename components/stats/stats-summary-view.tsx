"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { ProgressRing } from "@/components/game/progress-ring";
import { WeaknessAnalysisCard } from "@/components/stats/weakness-analysis-card";
import { Card, cardVariants } from "@/components/ui/card";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { StatsSummaryResponse } from "@/types/stats";

/**
 * 성장 지표(총 등록 단어)에 한해 카운트업 애니메이션을 허용한다는 D.1 원칙에 따른
 * 최소한의 구현 — 목표값이 바뀔 때만(최초 로딩 0 → 실제 값 포함) 그 사이를 센다.
 * 배경 탭처럼 requestAnimationFrame이 실행되지 않는 상황에서도 숫자가 실제 값과
 * 어긋난 채 멈춰 있으면 안 되므로, setTimeout 폴백으로 최종값을 강제한다.
 */
function useCountUp(target: number, durationMs = 500) {
  const [value, setValue] = useState(target);
  const prevTargetRef = useRef(target);

  useEffect(() => {
    const from = prevTargetRef.current;
    prevTargetRef.current = target;
    if (from === target) return;

    let settled = false;
    let startTs: number | null = null;
    let frameId: number;

    function step(ts: number) {
      if (startTs === null) startTs = ts;
      const progress = Math.min(1, (ts - startTs) / durationMs);
      setValue(Math.round(from + (target - from) * progress));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        settled = true;
      }
    }
    frameId = requestAnimationFrame(step);

    const fallback = setTimeout(() => {
      if (!settled) setValue(target);
    }, durationMs + 50);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(fallback);
    };
  }, [target, durationMs]);

  return value;
}

function StatTile({
  label,
  value,
  accentClassName,
}: {
  label: string;
  value: number;
  accentClassName?: string;
}) {
  return (
    <div className={cn(cardVariants(), "flex flex-col gap-1 p-3")}>
      <span className="text-xs font-bold text-foreground/60">{label}</span>
      <span className={cn("text-2xl font-extrabold text-foreground", accentClassName)}>
        {value}
      </span>
    </div>
  );
}

export function StatsSummaryView() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["stats", "summary"],
    queryFn: () => apiFetch<StatsSummaryResponse>("/api/stats/summary"),
  });

  const animatedTotal = useCountUp(data?.words.total ?? 0);

  if (isLoading) {
    return <p className="text-sm text-foreground/60">불러오는 중...</p>;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-error">
        {error instanceof ApiClientError ? error.message : "통계를 불러오지 못했습니다."}
      </p>
    );
  }

  const { words, studyCounts } = data;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-lg font-extrabold text-foreground">통계</h1>

      <Card variant="elevated" title="STATS.EXE" className="flex items-center gap-6">
        <ProgressRing
          value={words.mastered}
          max={Math.max(words.total, 1)}
          label="학습 완료 비율"
        />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-foreground/60">총 등록 단어</span>
          <span className="text-4xl font-extrabold text-foreground">{animatedTotal}개</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="학습 완료" value={words.mastered} accentClassName="text-success" />
        <StatTile label="학습 중" value={words.learning} accentClassName="text-primary" />
        <StatTile label="복습 필요" value={words.review} accentClassName="text-warning" />
        <StatTile label="취약 단어" value={words.weak} accentClassName="text-error" />
      </div>

      <Card title="기간별 학습량" titleColor="mint">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-foreground/60">오늘</span>
            <span className="text-2xl font-extrabold text-foreground">{studyCounts.today}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-foreground/60">이번 주</span>
            <span className="text-2xl font-extrabold text-foreground">{studyCounts.week}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-foreground/60">이번 달</span>
            <span className="text-2xl font-extrabold text-foreground">{studyCounts.month}</span>
          </div>
        </div>
      </Card>

      <WeaknessAnalysisCard />
    </div>
  );
}

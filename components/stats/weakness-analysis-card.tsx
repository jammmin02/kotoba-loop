"use client";

import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { QUIZ_TYPE_LABELS } from "@/lib/quiz/types";
import type { WeaknessAnalysisResponse } from "@/types/stats";

/** 통계 페이지(PROMPT 22)의 AI 취약점 분석 섹션(PROMPT 38, 계획서 35장). */
export function WeaknessAnalysisCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["stats", "weakness"],
    queryFn: () => apiFetch<WeaknessAnalysisResponse>("/api/stats/weakness"),
  });

  if (isLoading) {
    return (
      <Card title="AI 취약점 분석" titleColor="pink">
        <p className="text-sm text-foreground/60">불러오는 중...</p>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card title="AI 취약점 분석" titleColor="pink">
        <p className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "취약점 분석을 불러오지 못했습니다."}
        </p>
      </Card>
    );
  }

  if (!data.hasEnoughData) {
    return (
      <Card title="AI 취약점 분석" titleColor="pink">
        <p className="text-sm text-foreground/60">
          아직 데이터가 더 필요해요. 문제를 조금 더 풀면 유형별 정답률과 AI 분석이 표시됩니다.
        </p>
      </Card>
    );
  }

  return (
    <Card title="AI 취약점 분석" titleColor="pink">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {data.accuracyByType.map((row) => (
            <ProgressBar
              key={row.quizType}
              label={`${QUIZ_TYPE_LABELS[row.quizType]} (${row.total}문제)`}
              value={row.accuracy}
            />
          ))}
        </div>

        {data.comment ? (
          <div className="border-2 border-pixel-ink bg-titlebar-pink/20 p-3">
            <p className="text-xs font-bold text-foreground/60">AI 코멘트</p>
            <p className="mt-1 text-sm text-foreground">{data.comment}</p>
          </div>
        ) : (
          <p className="text-xs text-foreground/50">
            AI 코멘트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
          </p>
        )}
      </div>
    </Card>
  );
}

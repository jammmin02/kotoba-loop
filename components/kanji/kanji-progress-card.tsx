"use client";

import { useQuery } from "@tanstack/react-query";

import { ProgressRing } from "@/components/game/progress-ring";
import { Card } from "@/components/ui/card";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { KanjiProgressResponse } from "@/types/kanji";

/** 상용한자 전체 학습 진행률(계획서 31장: "982/2,136, 45.9%") — StatsSummaryView의
 *  단어 Progress Ring(mastered/total)과 같은 방식으로 재사용한다(PROMPT 35). */
export function KanjiProgressCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["kanji", "progress"],
    queryFn: () => apiFetch<KanjiProgressResponse>("/api/kanji/progress"),
  });

  if (isLoading) {
    return <p className="text-sm text-foreground/60">학습률을 불러오는 중...</p>;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-error">
        {error instanceof ApiClientError ? error.message : "학습률을 불러오지 못했습니다."}
      </p>
    );
  }

  return (
    <Card
      variant="elevated"
      title="漢字LEVEL.EXE"
      titleColor="mint"
      className="flex items-center gap-6"
    >
      <ProgressRing value={data.mastered} max={Math.max(data.total, 1)} label="한자 학습률" />
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-foreground/60">마스터한 한자</span>
        <span className="text-2xl font-extrabold text-foreground">
          {data.mastered.toLocaleString()} / {data.total.toLocaleString()}
        </span>
        <span className="text-xs text-foreground/50">{data.rate}%</span>
      </div>
    </Card>
  );
}

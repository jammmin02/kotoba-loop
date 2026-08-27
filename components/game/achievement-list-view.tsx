"use client";

import { useQuery } from "@tanstack/react-query";

import { CollectionGrid } from "@/components/game/collection-grid";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { AchievementsResponse, AchievementView } from "@/types/achievement";

function toCollectionItems(achievements: AchievementView[]) {
  return achievements.map((achievement) => ({
    id: achievement.code,
    label: achievement.title,
    unlocked: achievement.unlocked,
  }));
}

/** 업적 목록 화면(구현 범위 — Collection Grid, PROMPT 05 재사용). 카테고리별로 묶어서
 * 단어/한자 진행 상황을 각각 보여준다(한자 업적은 PROMPT 36부터 실제로 달성 가능하다). */
export function AchievementListView() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["game", "achievements"],
    queryFn: () => apiFetch<AchievementsResponse>("/api/game/achievements"),
  });

  if (isLoading) {
    return <p className="text-sm text-foreground/60">불러오는 중...</p>;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-error">
        {error instanceof ApiClientError ? error.message : "업적을 불러오지 못했습니다."}
      </p>
    );
  }

  const wordAchievements = data.filter((achievement) => achievement.category === "word");
  const kanjiAchievements = data.filter((achievement) => achievement.category === "kanji");

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-lg font-extrabold text-foreground">업적</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-foreground/70">단어 업적</h2>
        <CollectionGrid items={toCollectionItems(wordAchievements)} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-foreground/70">한자 업적</h2>
        <CollectionGrid items={toCollectionItems(kanjiAchievements)} />
      </section>
    </div>
  );
}

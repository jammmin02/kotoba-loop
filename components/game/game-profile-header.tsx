"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { ExpBar } from "@/components/game/exp-bar";
import { LevelBadge } from "@/components/game/level-badge";
import { LEVEL_UP_GLOW_DISPLAY_MS, useLevelUpPending } from "@/components/game/level-up-store";
import { useStreakFreezeNotice } from "@/components/game/streak-freeze-toast";
import { StreakIndicator } from "@/components/game/streak-indicator";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { GameProfileResponse } from "@/types/game";

/** `TodaySummaryView`(components/study/today-summary-view.tsx)와 동일한 useQuery 패턴. */
export function GameProfileHeader() {
  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["game", "profile"],
    queryFn: () => apiFetch<GameProfileResponse>("/api/game/profile"),
  });
  const [levelUpPending, clearLevelUpPending] = useLevelUpPending();
  useStreakFreezeNotice(profile?.streakFreezeJustConsumed);

  // 뱃지가 실제로 화면에 보이는 이 순간에만 glow를 재생하고, 재생이 끝나면 pending을 지운다
  // (다음에 또 마운트될 때 다시 재생되지 않도록).
  useEffect(() => {
    if (!levelUpPending) return;
    const timer = setTimeout(clearLevelUpPending, LEVEL_UP_GLOW_DISPLAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelUpPending]);

  if (isLoading) return null;
  if (isError) {
    return (
      <p className="text-xs text-error">
        {error instanceof ApiClientError ? error.message : "레벨 정보를 불러오지 못했습니다."}
      </p>
    );
  }
  if (!profile) return null;

  return (
    <div className="flex w-full max-w-md items-center gap-3">
      <LevelBadge
        level={profile.level}
        variant={levelUpPending ? "level-up" : "default"}
        size="sm"
      />
      <ExpBar currentExp={profile.exp} requiredExp={profile.requiredExp} className="flex-1" />
      <StreakIndicator days={profile.currentStreak} freezeCount={profile.streakFreezeCount} />
    </div>
  );
}

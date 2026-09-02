"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useStreakFreezeNotice } from "@/components/game/streak-freeze-toast";
import { StreakIndicator } from "@/components/game/streak-indicator";
import { StudyCalendar } from "@/components/game/study-calendar";
import { Card } from "@/components/ui/card";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { GameCalendarResponse, GameProfileResponse } from "@/types/game";

interface MonthState {
  year: number;
  month: number;
}

function shiftMonth({ year, month }: MonthState, delta: number): MonthState {
  const zeroBasedTotal = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zeroBasedTotal / 12), month: (zeroBasedTotal % 12) + 1 };
}

export interface StreakCalendarViewProps {
  /** /study 허브에 끼워 넣을 때는 페이지 쪽 제목을 쓰므로 여기 제목은 숨긴다. 기본값은 표시. */
  showHeading?: boolean;
}

export function StreakCalendarView({ showHeading = true }: StreakCalendarViewProps = {}) {
  // null이면 "서버 기본값(오늘이 속한 달)을 그대로 보여준다"는 뜻 — 클라이언트가 별도로
  // KST "이번 달"을 계산할 필요가 없다. 이전/다음 달 버튼을 누른 순간에만, 그때까지
  // 받아온 calendar 응답의 year/month를 기준으로 다음 요청 대상을 정해 채운다.
  const [override, setOverride] = useState<MonthState | null>(null);

  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
  } = useQuery({
    queryKey: ["game", "profile"],
    queryFn: () => apiFetch<GameProfileResponse>("/api/game/profile"),
  });

  const {
    data: calendar,
    isLoading: isCalendarLoading,
    isError: isCalendarError,
    error: calendarError,
  } = useQuery({
    queryKey: ["game", "calendar", override?.year ?? null, override?.month ?? null],
    queryFn: () =>
      apiFetch<GameCalendarResponse>(
        override
          ? `/api/game/calendar?year=${override.year}&month=${override.month}`
          : "/api/game/calendar",
      ),
  });

  const showRiskNotice = !!profile && profile.currentStreak > 0 && !profile.studiedToday;
  useStreakFreezeNotice(profile?.streakFreezeJustConsumed);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      {showHeading && <h1 className="text-lg font-extrabold text-foreground">스트릭 · 캘린더</h1>}

      <Card variant="elevated" title="STREAK.EXE" className="flex flex-col items-center gap-3">
        {isProfileLoading ? (
          <p className="text-sm text-foreground/60">불러오는 중...</p>
        ) : isProfileError || !profile ? (
          <p className="text-sm text-error">
            {profileError instanceof ApiClientError
              ? profileError.message
              : "스트릭 정보를 불러오지 못했습니다."}
          </p>
        ) : (
          <>
            <StreakIndicator days={profile.currentStreak} freezeCount={profile.streakFreezeCount} />
            <p className="text-xs font-bold text-foreground/50">
              최고 기록 {profile.longestStreak}일
            </p>
            {showRiskNotice && (
              <p className="text-center text-xs font-bold text-warning">
                지금 {profile.currentStreak}일째 이어가는 중이에요. 오늘 학습을 마치면 스트릭이
                계속돼요 🔥
              </p>
            )}
          </>
        )}
      </Card>

      <Card title="학습 캘린더" titleColor="mint">
        {isCalendarLoading || !calendar ? (
          <p className="text-sm text-foreground/60">불러오는 중...</p>
        ) : isCalendarError ? (
          <p className="text-sm text-error">
            {calendarError instanceof ApiClientError
              ? calendarError.message
              : "캘린더를 불러오지 못했습니다."}
          </p>
        ) : (
          <StudyCalendar
            year={calendar.year}
            month={calendar.month}
            studiedDates={calendar.studiedDates}
            protectedDates={calendar.protectedDates}
            registeredCounts={calendar.registeredCounts}
            todayKey={calendar.todayKey}
            onPrevMonth={() =>
              setOverride(shiftMonth({ year: calendar.year, month: calendar.month }, -1))
            }
            onNextMonth={() =>
              setOverride(shiftMonth({ year: calendar.year, month: calendar.month }, 1))
            }
          />
        )}
      </Card>
    </div>
  );
}

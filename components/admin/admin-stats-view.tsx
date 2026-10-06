"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { BarChart } from "@/components/admin/bar-chart";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { AdminStats } from "@/types/admin";

type Period = "day" | "week";

function shortDate(key: string): string {
  return key.slice(5).replace("-", "/");
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 border-2 border-pixel-ink bg-background p-3">
      <span className="text-xs font-bold text-foreground/60">{label}</span>
      <span className="text-2xl font-bold">{value.toLocaleString("ko-KR")}</span>
    </div>
  );
}

export function AdminStatsView() {
  const [period, setPeriod] = useState<Period>("day");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => apiFetch<AdminStats>("/api/admin/stats"),
  });

  return (
    <Card
      variant="elevated"
      title="STATS.EXE"
      titleColor="mint"
      className="flex flex-col gap-5 p-4"
    >
      <h1 className="text-lg font-bold">운영 통계</h1>

      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}
      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "불러오지 못했습니다."}
        </p>
      )}

      {data && (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold">가입 추이</h2>
              <div className="flex gap-2">
                <ChipButton selected={period === "day"} onClick={() => setPeriod("day")}>
                  일별
                </ChipButton>
                <ChipButton selected={period === "week"} onClick={() => setPeriod("week")}>
                  주별
                </ChipButton>
              </div>
            </div>
            {period === "day" ? (
              <BarChart
                title="최근 30일 일별 가입"
                unit="명"
                data={data.signupsDaily.map((d) => ({
                  label: shortDate(d.date),
                  value: d.count,
                }))}
              />
            ) : (
              <BarChart
                title="최근 12주 주별 가입 (월요일 시작)"
                unit="명"
                data={data.signupsWeekly.map((w) => ({
                  label: shortDate(w.weekStart),
                  value: w.count,
                }))}
              />
            )}
          </section>

          <section className="flex flex-col gap-3 border-t-2 border-pixel-ink pt-4">
            <h2 className="text-base font-bold">학습 활성 사용자</h2>
            <p className="text-xs text-foreground/50">퀴즈·복습 기록이 있는 사용자 기준입니다.</p>
            <div className="grid grid-cols-3 gap-3">
              <Counter label="최근 24시간" value={data.active.today} />
              <Counter label="최근 7일" value={data.active.last7} />
              <Counter label="최근 30일" value={data.active.last30} />
            </div>
            <BarChart
              title="최근 30일 일별 활성 사용자"
              unit="명"
              barClassName="bg-secondary"
              data={data.activeDaily.map((d) => ({ label: shortDate(d.date), value: d.count }))}
            />
          </section>
        </>
      )}
    </Card>
  );
}

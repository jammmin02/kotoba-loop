"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { CompositionBreakdownStat, CompositionStats } from "@/lib/composition/stats";
import { cn } from "@/lib/utils";

function StatTile({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex flex-col gap-1 border-2 border-pixel-ink bg-surface p-3 shadow-pixel-sm">
      <span className="text-xs font-bold text-muted">{label}</span>
      <span className="text-2xl font-extrabold text-foreground">
        {value}
        <span className="ml-0.5 text-sm font-normal text-muted">{unit}</span>
      </span>
    </div>
  );
}

function AxisBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm font-bold text-muted">{label}</span>
      <div
        className="h-3 flex-1 border-2 border-pixel-ink bg-background"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div className="h-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}

function BreakdownList({
  title,
  rows,
  unit,
}: {
  title: string;
  rows: CompositionBreakdownStat[];
  unit: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-bold text-muted">{title}</h3>
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 border-2 border-pixel-ink bg-background px-3 py-1.5 text-sm"
          >
            <span className="font-bold text-foreground">{row.label}</span>
            <span className="font-content text-muted">
              {row.count}
              {unit} · 평균 <b className="text-foreground">{row.averageScore}</b>점
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDay(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}

function DailyChart({ daily, unit }: { daily: CompositionStats["daily"]; unit: string }) {
  const hasAny = daily.some((d) => d.count > 0);
  return (
    <div>
      <ul className="flex h-32 items-end gap-1" aria-label="최근 14일 평균 점수">
        {daily.map((day) => (
          <li
            key={day.date}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
            aria-label={
              day.averageScore === null
                ? `${formatDay(day.date)} 기록 없음`
                : `${formatDay(day.date)} 평균 ${day.averageScore}점, ${day.count}${unit}`
            }
          >
            {day.averageScore === null ? (
              <div className="h-1 border-t-2 border-dashed border-pixel-ink/40" />
            ) : (
              <div
                className="border-2 border-pixel-ink bg-primary"
                style={{ height: `${Math.max(day.averageScore, 4)}%` }}
              />
            )}
          </li>
        ))}
      </ul>
      <div className="mt-1 flex gap-1 text-[10px] text-muted" aria-hidden="true">
        {daily.map((day, i) => (
          <span key={day.date} className="min-w-0 flex-1 text-center">
            {(daily.length - 1 - i) % 3 === 0 ? formatDay(day.date) : ""}
          </span>
        ))}
      </div>
      {!hasAny && (
        <p className="mt-2 text-sm font-content text-muted">최근 14일 동안 기록이 없어요.</p>
      )}
    </div>
  );
}

export interface AiStatsCopy {
  title: string;
  description: string;
  questHref: string;
  questLabel: string;
  /** 기록 한 건을 세는 단위("문제", "번"). */
  unit: string;
  countLabel: string;
  acceptedLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  breakdownTitles: [string, string, string];
}

/** 작문·회화 통계가 함께 쓰는 패널 — 두 기능의 집계 결과(CompositionStats)가 같은 모양이다. */
export function AiStatsPanel({
  queryKey,
  url,
  copy,
}: {
  queryKey: string[];
  url: string;
  copy: AiStatsCopy;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => apiFetch<CompositionStats>(url),
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">{copy.title}</h2>
          <p className="mt-1 text-sm font-content text-muted">{copy.description}</p>
        </div>
        <Link
          href={copy.questHref}
          className="shrink-0 border-2 border-pixel-ink bg-surface px-3 py-1.5 text-sm font-bold text-foreground shadow-pixel-sm hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {copy.questLabel}
        </Link>
      </div>

      {isLoading && <p className="text-sm text-muted">불러오는 중…</p>}

      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "통계를 불러오지 못했어요."}
        </p>
      )}

      {data && data.totals.attemptCount === 0 && (
        <Card title="STATS.EXE" titleColor="mint" className="flex flex-col gap-2">
          <p className="font-bold text-foreground">{copy.emptyTitle}</p>
          <p className="text-sm font-content text-muted">{copy.emptyDescription}</p>
        </Card>
      )}

      {data && data.totals.attemptCount > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label={copy.countLabel} value={data.totals.attemptCount} unit={copy.unit} />
            <StatTile label="평균 점수" value={data.totals.averageScore} unit="점" />
            <StatTile label={copy.acceptedLabel} value={data.totals.acceptedRate} unit="%" />
            <StatTile label="힌트 사용률" value={data.totals.hintRate} unit="%" />
          </div>

          <Card title="최근 14일" titleColor="primary" className="flex flex-col gap-2">
            <DailyChart daily={data.daily} unit={copy.unit} />
          </Card>

          <Card title="항목별 평균" titleColor="pink" className="flex flex-col gap-3">
            <AxisBar label="문법" value={data.totals.averageGrammar} />
            <AxisBar label="어휘" value={data.totals.averageVocabulary} />
            <AxisBar label="자연스러움" value={data.totals.averageNaturalness} />
          </Card>

          <Card title="자주 틀리는 유형" titleColor="accent" className="flex flex-col gap-3">
            {data.mistakeKinds.length === 0 ? (
              <p className="text-sm font-content text-muted">
                아직 지적받은 부분이 없어요. 잘하고 있어요.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.mistakeKinds.map((item, i) => (
                  <li
                    key={item.kind}
                    className="flex items-center justify-between gap-3 border-2 border-pixel-ink bg-background px-3 py-1.5"
                  >
                    <span
                      className={cn("text-sm font-bold text-foreground", i === 0 && "text-error")}
                    >
                      {item.kind}
                    </span>
                    <span className="text-sm font-content text-muted">{item.count}회</span>
                  </li>
                ))}
              </ul>
            )}
            {data.naturalSuggestionCount > 0 && (
              <p className="text-sm font-content text-muted">
                더 자연스러운 표현을 제안받은 적이 {data.naturalSuggestionCount}번 있어요.
              </p>
            )}
          </Card>

          <Card title="조건별 기록" titleColor="mint" className="flex flex-col gap-4">
            <BreakdownList
              title={copy.breakdownTitles[0]}
              rows={data.bySituation}
              unit={copy.unit}
            />
            <BreakdownList
              title={copy.breakdownTitles[1]}
              rows={data.byVocabLevel}
              unit={copy.unit}
            />
            <BreakdownList
              title={copy.breakdownTitles[2]}
              rows={data.byCompositionLevel}
              unit={copy.unit}
            />
          </Card>
        </>
      )}
    </div>
  );
}

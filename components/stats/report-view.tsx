"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { QUIZ_TYPE_LABELS } from "@/lib/quiz/types";
import { MAX_REPORT_OFFSET } from "@/lib/study/report";
import { cn } from "@/lib/utils";
import type { StatsReportResponse } from "@/types/stats";

type ReportKind = StatsReportResponse["kind"];

const KIND_OPTIONS: { key: ReportKind; label: string }[] = [
  { key: "week", label: "주간" },
  { key: "month", label: "월간" },
];

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-2 border-pixel-ink bg-surface p-3">
      <span className="text-xs font-bold text-foreground/60">{label}</span>
      <span className="text-xl font-extrabold text-foreground">{value}</span>
    </div>
  );
}

/** 통계 화면(PROMPT 22)의 "주간/월간" 탭(PROMPT 44) — 완결된 캘린더 주/월 리포트를 보여준다. */
export function ReportView() {
  const [kind, setKind] = useState<ReportKind>("week");
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["stats", "report", kind, offset],
    queryFn: () => apiFetch<StatsReportResponse>(`/api/stats/report?kind=${kind}&offset=${offset}`),
  });

  function handleKindChange(next: ReportKind) {
    setKind(next);
    setOffset(0);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-extrabold text-foreground">주간·월간 리포트</h1>

      <div className="flex gap-2" role="tablist" aria-label="리포트 기간 종류">
        {KIND_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={kind === option.key}
            onClick={() => handleKindChange(option.key)}
            className={cn(
              "border-2 px-3 py-1.5 text-sm font-bold transition",
              kind === option.key
                ? "border-pixel-ink bg-primary text-primary-foreground shadow-bevel-sunken"
                : "border-pixel-ink bg-surface text-foreground/70 hover:bg-background",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOffset((prev) => Math.min(MAX_REPORT_OFFSET, prev + 1))}
          disabled={offset >= MAX_REPORT_OFFSET}
        >
          ◀ 이전
        </Button>
        <span className="text-sm font-bold text-foreground">{data ? data.period.label : " "}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOffset((prev) => Math.max(0, prev - 1))}
          disabled={offset <= 0}
        >
          다음 ▶
        </Button>
      </div>

      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}

      {isError && !isLoading && (
        <p className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "리포트를 불러오지 못했습니다."}
        </p>
      )}

      {data && !data.hasActivityData && (
        <Card title="리포트" titleColor="mint">
          <p className="text-sm text-foreground/60">
            이 기간에는 학습 기록이 없어요. 학습을 시작하면 다음 리포트부터 수치가 채워집니다.
          </p>
        </Card>
      )}

      {data && data.hasActivityData && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="학습 시간(추정)" value={`약 ${data.stats.studyMinutes}분`} />
            <StatTile label="새 단어" value={`${data.stats.newWordCount}개`} />
            <StatTile label="복습" value={`${data.stats.reviewCount}건`} />
            <StatTile label="새 한자" value={`${data.stats.newKanjiCount}자`} />
            <StatTile label="전체 정답률" value={`${data.stats.accuracyRate}%`} />
          </div>

          <Card title="취약점 요약" titleColor="pink">
            <div className="flex flex-col gap-4">
              {data.weakness.hasEnoughData ? (
                <div className="flex flex-col gap-2">
                  {data.weakness.accuracyByType.map((row) => (
                    <ProgressBar
                      key={row.quizType}
                      label={`${QUIZ_TYPE_LABELS[row.quizType]} (${row.total}문제)`}
                      value={row.accuracy}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground/60">
                  아직 데이터가 더 필요해요. 문제를 조금 더 풀면 유형별 정답률이 표시됩니다.
                </p>
              )}

              {data.weakKanji.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-foreground/60">최근 자주 틀리는 한자</p>
                  <div className="flex flex-wrap gap-2">
                    {data.weakKanji.map((k) => (
                      <span
                        key={k.kanjiId}
                        className="border-2 border-pixel-ink bg-titlebar-pink/20 px-2 py-1 text-sm font-bold"
                        title={k.meaning}
                      >
                        {k.character} · 오답률 {k.wrongRate}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title="AI 다음 기간 추천" titleColor="pink">
            {data.comment ? (
              <div className="border-2 border-pixel-ink bg-titlebar-pink/20 p-3">
                <p className="text-sm text-foreground">{data.comment}</p>
              </div>
            ) : (
              <p className="text-xs text-foreground/50">
                AI 코멘트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

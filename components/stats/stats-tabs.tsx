"use client";

import { useState } from "react";

import { ReportView } from "@/components/stats/report-view";
import { StatsSummaryView } from "@/components/stats/stats-summary-view";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "daily", label: "일간 요약" },
  { key: "report", label: "주간·월간 리포트" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * 통계(/stats) 화면의 탭 전환. 로드맵 지침(계획서 59장 "통계 > 주간/월간")에 따라 리포트를
 * 신규 최상위 메뉴로 만들지 않고 이 화면의 두 번째 탭으로 통합한다(PROMPT 44).
 */
export function StatsTabs() {
  const [tab, setTab] = useState<TabKey>("daily");

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex gap-2" role="tablist" aria-label="통계 화면 탭">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "border-2 px-3 py-1.5 text-sm font-bold transition",
              tab === t.key
                ? "border-pixel-ink bg-primary text-primary-foreground shadow-bevel-sunken"
                : "border-pixel-ink bg-surface text-foreground/70 hover:bg-background",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "daily" ? <StatsSummaryView /> : <ReportView />}
    </div>
  );
}

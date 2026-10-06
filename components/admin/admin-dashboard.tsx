"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { AdminSummary } from "@/types/admin";

function Counter({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 border-2 border-pixel-ink bg-background p-4">
      <span className="text-xs font-bold text-foreground/60">{label}</span>
      <span className={highlight ? "text-3xl font-bold text-primary" : "text-3xl font-bold"}>
        {value}
      </span>
    </div>
  );
}

export function AdminDashboard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "summary"],
    queryFn: () => apiFetch<AdminSummary>("/api/admin/summary"),
  });

  return (
    <Card
      variant="elevated"
      title="ADMIN.EXE"
      titleColor="pink"
      className="flex flex-col gap-4 p-4"
    >
      <h1 className="text-lg font-bold">가입 현황</h1>

      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}
      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "불러오지 못했습니다."}
        </p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Counter
              label="승인 대기"
              value={data.counts.PENDING}
              highlight={data.counts.PENDING > 0}
            />
            <Counter label="승인" value={data.counts.APPROVED} />
            <Counter label="거절" value={data.counts.REJECTED} />
            <Counter label="정지" value={data.counts.SUSPENDED} />
            <Counter label="오늘 가입" value={data.signupsToday} />
            <Counter
              label="처리 대기 신고"
              value={data.openReportGroups}
              highlight={data.openReportGroups > 0}
            />
          </div>
          {data.counts.PENDING > 0 && (
            <Link
              href="/admin/members?status=PENDING"
              className="text-sm font-bold text-primary hover:underline"
            >
              승인 대기 {data.counts.PENDING}건 확인하기 →
            </Link>
          )}
        </>
      )}
    </Card>
  );
}

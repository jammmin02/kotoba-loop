"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Pagination } from "@/components/admin/pagination";
import { Card } from "@/components/ui/card";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { AdminAuditAction, AdminAuditList } from "@/types/admin";

const ACTION_LABELS: Record<AdminAuditAction, string> = {
  APPROVE: "승인",
  REJECT: "거절",
  SUSPEND: "정지",
  RESTORE: "복구",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

export function AdminAuditView() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "audit", page],
    queryFn: () => apiFetch<AdminAuditList>(`/api/admin/audit?page=${page}`),
  });

  return (
    <Card
      variant="elevated"
      title="AUDIT.EXE"
      titleColor="mint"
      className="flex flex-col gap-4 p-4"
    >
      <h1 className="text-lg font-bold">감사 로그</h1>

      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}
      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "불러오지 못했습니다."}
        </p>
      )}
      {data && data.logs.length === 0 && (
        <p className="text-sm text-foreground/60">기록이 없습니다.</p>
      )}

      {data && data.logs.length > 0 && (
        <ul className="flex flex-col divide-y-2 divide-pixel-ink border-2 border-pixel-ink">
          {data.logs.map((log) => (
            <li key={log.id} className="flex flex-col gap-1 bg-surface p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border-2 border-pixel-ink bg-background px-2 py-0.5 text-xs font-bold">
                  {ACTION_LABELS[log.action]}
                </span>
                <span className="font-bold">{log.targetUserEmail}</span>
              </div>
              <span className="text-xs text-foreground/60">
                {log.adminNickname ?? "(삭제된 관리자)"} · {formatDateTime(log.createdAt)}
              </span>
              {log.reason && <span className="text-xs text-foreground/70">사유: {log.reason}</span>}
            </li>
          ))}
        </ul>
      )}

      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onChange={setPage}
        />
      )}
    </Card>
  );
}

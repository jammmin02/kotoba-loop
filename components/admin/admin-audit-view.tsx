"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Pagination } from "@/components/admin/pagination";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { AdminAuditAction, AdminAuditGroup, AdminAuditList } from "@/types/admin";

export const AUDIT_ACTION_LABELS: Record<AdminAuditAction, string> = {
  APPROVE: "가입 승인",
  REJECT: "가입 거절",
  SUSPEND: "정지",
  RESTORE: "정지 해제",
  HIDE_CONTENT: "콘텐츠 숨김",
  RESTORE_CONTENT: "콘텐츠 복구",
  DELETE_CONTENT: "콘텐츠 삭제",
  WARN: "경고",
  RESTRICT_WRITE: "작성 제한",
  RESOLVE_REPORT: "신고 처리",
  DISMISS_REPORT: "신고 기각",
  CREATE_ANNOUNCEMENT: "공지 등록",
  UPDATE_ANNOUNCEMENT: "공지 수정",
  DELETE_ANNOUNCEMENT: "공지 삭제",
  UPDATE_SETTING: "설정 변경",
  UPDATE_CONTENT: "학습 데이터 수정",
  SOFT_DELETE_USER: "회원 삭제",
  RESTORE_USER: "회원 복구",
  EXPORT_MEMBERS: "회원 내보내기",
  BLOCK_AI_RESULT: "AI 결과 차단",
};

const GROUPS: { group: AdminAuditGroup; label: string }[] = [
  { group: "all", label: "전체" },
  { group: "report", label: "신고 처리" },
  { group: "content", label: "콘텐츠" },
  { group: "sanction", label: "제재" },
  { group: "member", label: "회원" },
  { group: "operation", label: "운영" },
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

export function AdminAuditView() {
  const [group, setGroup] = useState<AdminAuditGroup>("all");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "audit", group, page],
    queryFn: () => apiFetch<AdminAuditList>(`/api/admin/audit?group=${group}&page=${page}`),
  });

  return (
    <Card
      variant="elevated"
      title="AUDIT.EXE"
      titleColor="mint"
      className="flex flex-col gap-4 p-4"
    >
      <h1 className="text-lg font-bold">감사 로그</h1>

      <div className="flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <ChipButton
            key={g.group}
            selected={group === g.group}
            onClick={() => {
              setGroup(g.group);
              setPage(1);
            }}
          >
            {g.label}
          </ChipButton>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted">불러오는 중...</p>}
      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "불러오지 못했습니다."}
        </p>
      )}
      {data && data.logs.length === 0 && <p className="text-sm text-muted">기록이 없습니다.</p>}

      {data && data.logs.length > 0 && (
        <ul className="flex flex-col divide-y-2 divide-pixel-ink border-2 border-pixel-ink">
          {data.logs.map((log) => (
            <li key={log.id} className="flex flex-col gap-1 bg-surface p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border-2 border-pixel-ink bg-background px-2 py-0.5 text-xs font-bold">
                  {AUDIT_ACTION_LABELS[log.action]}
                </span>
                <span className="font-bold">{log.targetUserEmail}</span>
                {log.targetLabel && (
                  <span className="text-xs text-muted">「{log.targetLabel}」</span>
                )}
              </div>
              <span className="text-xs text-muted">
                {log.adminNickname ?? "(삭제된 관리자)"} · {formatDateTime(log.createdAt)}
              </span>
              {log.reason && <span className="text-xs text-muted">사유: {log.reason}</span>}
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

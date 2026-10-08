"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Pagination } from "@/components/admin/pagination";
import { REPORT_REASON_LABELS } from "@/components/admin/report-labels";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { AdminReportGroup, AdminReportList, ReportStatus } from "@/types/admin";

type ContentAction = "NONE" | "HIDE" | "DELETE";
type UserAction = "NONE" | "WARN" | "RESTRICT_1D" | "RESTRICT_7D" | "RESTRICT_30D";

const STATUS_TABS: { status: ReportStatus; label: string }[] = [
  { status: "OPEN", label: "처리 대기" },
  { status: "RESOLVED", label: "처리 완료" },
  { status: "DISMISSED", label: "기각" },
];

const CONTENT_ACTION_LABELS: Record<ContentAction, string> = {
  NONE: "콘텐츠 조치 없음",
  HIDE: "숨김",
  DELETE: "삭제",
};

const USER_ACTION_LABELS: Record<UserAction, string> = {
  NONE: "작성자 제재 없음",
  WARN: "경고",
  RESTRICT_1D: "작성 제한 1일",
  RESTRICT_7D: "작성 제한 7일",
  RESTRICT_30D: "작성 제한 30일",
};

const CONTENT_ACTION_OPTIONS = (Object.keys(CONTENT_ACTION_LABELS) as ContentAction[]).map((a) => ({
  value: a,
  label: a === "NONE" ? `${CONTENT_ACTION_LABELS[a]} (신고 기각)` : CONTENT_ACTION_LABELS[a],
}));

const USER_ACTION_OPTIONS = (Object.keys(USER_ACTION_LABELS) as UserAction[]).map((a) => ({
  value: a,
  label: USER_ACTION_LABELS[a],
}));

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

/** 제재 단계: 경고 → 작성 제한 → 정지. 현재 이력으로 다음 단계를 안내한다. */
function nextStepHint(owner: NonNullable<AdminReportGroup["target"]>["owner"]): string {
  if (owner.status === "SUSPENDED") return "이미 정지된 회원입니다.";
  if (owner.writeRestrictedUntil && new Date(owner.writeRestrictedUntil) > new Date()) {
    return "작성 제한 중입니다. 반복되면 회원 관리에서 정지를 검토하세요.";
  }
  if (owner.warningCount === 0) return "제재 이력이 없습니다. 경고부터 권장합니다.";
  return `경고 ${owner.warningCount}회. 작성 제한을 권장합니다.`;
}

export function AdminReportsView() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportStatus>("OPEN");
  const [page, setPage] = useState(1);
  const [resolving, setResolving] = useState<AdminReportGroup | null>(null);
  const [contentAction, setContentAction] = useState<ContentAction>("HIDE");
  const [userAction, setUserAction] = useState<UserAction>("NONE");
  const [note, setNote] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "reports", status, page],
    queryFn: () => apiFetch<AdminReportList>(`/api/admin/reports?status=${status}&page=${page}`),
  });

  const resolve = useMutation({
    mutationFn: (input: {
      targetId: string;
      contentAction: ContentAction;
      userAction: UserAction;
      note?: string;
    }) =>
      apiFetch<{ closed: number }>("/api/admin/reports/resolve", {
        method: "POST",
        body: { targetType: "BOOK", ...input },
      }),
    onSuccess: (result) => {
      toast.success(`신고 ${result.closed}건을 처리했습니다.`);
      setResolving(null);
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "처리에 실패했습니다.");
    },
  });

  function openResolve(group: AdminReportGroup) {
    setResolving(group);
    setContentAction(group.target?.hidden ? "NONE" : "HIDE");
    setUserAction("NONE");
    setNote("");
  }

  const dismiss = contentAction === "NONE" && userAction === "NONE";
  const irreversible = contentAction === "DELETE";

  return (
    <Card
      variant="elevated"
      title="REPORTS.EXE"
      titleColor="pink"
      className="flex flex-col gap-4 p-4"
    >
      <h1 className="text-lg font-bold">신고 관리</h1>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <ChipButton
            key={tab.status}
            selected={status === tab.status}
            onClick={() => {
              setStatus(tab.status);
              setPage(1);
            }}
          >
            {tab.label}
          </ChipButton>
        ))}
      </div>
      <p className="text-xs text-muted">같은 단어장의 신고는 하나로 묶여 건수 순으로 표시됩니다.</p>

      {isLoading && <p className="text-sm text-muted">불러오는 중...</p>}
      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "불러오지 못했습니다."}
        </p>
      )}
      {data && data.groups.length === 0 && (
        <p className="text-sm text-muted">해당하는 신고가 없습니다.</p>
      )}

      {data?.groups.map((group) => (
        <div
          key={`${group.targetId}-${group.status}`}
          className="flex flex-col gap-3 border-2 border-pixel-ink bg-surface p-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {group.target ? group.target.title : "(삭제된 단어장)"}
              </p>
              {group.target && (
                <p className="text-xs text-muted">
                  {group.target.owner.nickname} · {group.target.owner.email} · 단어{" "}
                  {group.target.wordCount}개{group.target.hidden && " · 숨김 상태"}
                </p>
              )}
            </div>
            <span className="border-2 border-pixel-ink bg-error px-2 py-0.5 text-xs font-bold text-error-foreground">
              신고 {group.reportCount}건
            </span>
          </div>

          {group.target?.description && (
            <p className="line-clamp-3 border-l-4 border-pixel-ink pl-2 text-sm font-content text-muted">
              {group.target.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 text-xs">
            {group.reasons.map((r) => (
              <span key={r.reason} className="border-2 border-pixel-ink bg-background px-2 py-0.5">
                {REPORT_REASON_LABELS[r.reason]} {r.count}
              </span>
            ))}
          </div>

          {group.details.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-muted">
              {group.details.map((d, i) => (
                <li key={i}>· {d}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted">
              최근 신고 {formatDateTime(group.lastReportedAt)}
              {group.handledAt && ` · 처리 ${formatDateTime(group.handledAt)}`}
              {group.resolutionNote && ` · ${group.resolutionNote}`}
            </span>
            {group.status === "OPEN" && (
              <Button size="sm" onClick={() => openResolve(group)}>
                처리하기
              </Button>
            )}
          </div>
        </div>
      ))}

      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onChange={setPage}
        />
      )}

      <Modal open={resolving !== null} onClose={() => setResolving(null)} title="신고 처리">
        {resolving && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold">
              {resolving.target ? resolving.target.title : "(삭제된 단어장)"} · 신고{" "}
              {resolving.reportCount}건
            </p>

            {resolving.target ? (
              <>
                <p className="border-2 border-pixel-ink bg-background p-2 text-xs">
                  작성자 {resolving.target.owner.nickname} — {nextStepHint(resolving.target.owner)}
                </p>
                <Select
                  label="콘텐츠 조치"
                  value={contentAction}
                  onChange={(e) => setContentAction(e.target.value as ContentAction)}
                  options={CONTENT_ACTION_OPTIONS}
                />
                <Select
                  label="작성자 제재"
                  value={userAction}
                  onChange={(e) => setUserAction(e.target.value as UserAction)}
                  options={USER_ACTION_OPTIONS}
                />
              </>
            ) : (
              <p className="text-xs text-muted">대상이 이미 삭제되어 신고만 기각할 수 있습니다.</p>
            )}

            <Textarea
              label="사유 (선택, 작성자에게 숨김 사유로 보입니다)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
            />

            {irreversible && (
              <p role="alert" className="text-xs font-bold text-error">
                삭제한 단어장은 복구할 수 없습니다.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResolving(null)}>
                취소
              </Button>
              <Button
                variant={irreversible ? "danger" : "primary"}
                loading={resolve.isPending}
                onClick={() =>
                  resolve.mutate({
                    targetId: resolving.targetId,
                    contentAction: resolving.target ? contentAction : "NONE",
                    userAction: resolving.target ? userAction : "NONE",
                    note: note.trim() || undefined,
                  })
                }
              >
                {dismiss || !resolving.target ? "기각" : "처리"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

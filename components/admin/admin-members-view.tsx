"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { MemberDetailModal } from "@/components/admin/member-detail-modal";
import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type {
  AdminMemberAction,
  AdminMemberList,
  AdminMemberRow,
  AdminReviewResult,
  AdminUserStatus,
} from "@/types/admin";

type Tab = AdminUserStatus | "DELETED";

const STATUS_TABS: { status: Tab; label: string }[] = [
  { status: "PENDING", label: "대기" },
  { status: "APPROVED", label: "승인" },
  { status: "REJECTED", label: "거절" },
  { status: "SUSPENDED", label: "정지" },
  { status: "DELETED", label: "삭제됨" },
];

const ACTION_LABELS: Record<AdminMemberAction, string> = {
  APPROVE: "승인",
  REJECT: "거절",
  SUSPEND: "정지",
  RESTORE: "복구",
};

// 현재 상태에서 할 수 있는 액션. 거절(REJECTED)은 재신청 불가라 되돌리는 액션이 없다.
const ROW_ACTIONS: Record<AdminUserStatus, AdminMemberAction[]> = {
  PENDING: ["APPROVE", "REJECT"],
  APPROVED: ["SUSPEND"],
  REJECTED: [],
  SUSPENDED: ["RESTORE"],
};

interface PendingAction {
  action: AdminMemberAction;
  members: AdminMemberRow[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { dateStyle: "medium" });
}

export function AdminMembersView({ initialStatus }: { initialStatus: Tab }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Tab>(initialStatus);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminMemberRow | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "members", status, q, page],
    queryFn: () => {
      const params = new URLSearchParams({ status, page: String(page) });
      if (q) params.set("q", q);
      return apiFetch<AdminMemberList>(`/api/admin/members?${params}`);
    },
  });

  const review = useMutation({
    mutationFn: (input: { userIds: string[]; action: AdminMemberAction; reason?: string }) =>
      apiFetch<AdminReviewResult>("/api/admin/members/review", { method: "POST", body: input }),
    onSuccess: (result, input) => {
      const label = ACTION_LABELS[input.action];
      toast.success(
        result.skipped > 0
          ? `${result.updated}명 ${label} 완료 (${result.skipped}명은 이미 처리되어 건너뜀)`
          : `${result.updated}명 ${label} 완료`,
      );
      setSelected(new Set());
      setPendingAction(null);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "처리에 실패했습니다.");
    },
  });

  const setDeleted = useMutation({
    mutationFn: (input: { userId: string; action: "DELETE" | "RESTORE"; reason?: string }) =>
      apiFetch<{ ok: true }>("/api/admin/members/delete", { method: "POST", body: input }),
    onSuccess: (_result, input) => {
      toast.success(input.action === "DELETE" ? "회원을 삭제했습니다." : "회원을 복구했습니다.");
      setDeleteTarget(null);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "처리에 실패했습니다.");
    },
  });

  async function exportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ status });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/members/export?${params}`);
      if (!res.ok) {
        const body: { error?: { message?: string } } = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? "내보내기에 실패했습니다.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("CSV를 내려받았습니다.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "내보내기에 실패했습니다.");
    } finally {
      setExporting(false);
    }
  }

  const members = data?.members ?? [];
  const selectableActions = status === "DELETED" ? [] : ROW_ACTIONS[status];
  const selectedMembers = members.filter((m) => selected.has(m.id));

  function changeStatus(next: Tab) {
    setStatus(next);
    setPage(1);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === members.length ? new Set() : new Set(members.map((m) => m.id)),
    );
  }

  function openAction(action: AdminMemberAction, targets: AdminMemberRow[]) {
    if (targets.length === 0) return;
    setReason("");
    // 승인·복구는 되돌리기 쉬워 바로 처리하고, 거절·정지는 사유 입력과 확인을 거친다.
    if (action === "APPROVE" || action === "RESTORE") {
      review.mutate({ userIds: targets.map((t) => t.id), action });
      return;
    }
    setPendingAction({ action, members: targets });
  }

  function confirmAction() {
    if (!pendingAction) return;
    review.mutate({
      userIds: pendingAction.members.map((m) => m.id),
      action: pendingAction.action,
      reason: reason.trim() || undefined,
    });
  }

  return (
    <Card
      variant="elevated"
      title="MEMBERS.EXE"
      titleColor="primary"
      className="flex flex-col gap-4 p-4"
    >
      <h1 className="text-lg font-bold">회원 관리</h1>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <ChipButton
            key={tab.status}
            selected={status === tab.status}
            onClick={() => changeStatus(tab.status)}
          >
            {tab.label}
          </ChipButton>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(searchInput.trim());
          setPage(1);
          setSelected(new Set());
        }}
      >
        <Input
          aria-label="회원 검색"
          placeholder="이메일 또는 닉네임 검색"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="outline">
          검색
        </Button>
        <Button
          type="button"
          variant="outline"
          loading={exporting}
          onClick={() => void exportCsv()}
        >
          CSV
        </Button>
      </form>

      {selectableActions.length > 0 && members.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-2 border-pixel-ink bg-background p-3">
          <Checkbox
            label="전체 선택"
            checked={selected.size === members.length}
            onChange={toggleAll}
          />
          <span className="text-xs text-foreground/60">{selected.size}명 선택</span>
          <div className="ml-auto flex gap-2">
            {selectableActions.map((action) => (
              <Button
                key={action}
                size="sm"
                variant={action === "APPROVE" || action === "RESTORE" ? "secondary" : "danger"}
                disabled={selected.size === 0 || review.isPending}
                onClick={() => openAction(action, selectedMembers)}
              >
                선택 {ACTION_LABELS[action]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}
      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "불러오지 못했습니다."}
        </p>
      )}
      {data && members.length === 0 && (
        <p className="text-sm text-foreground/60">해당하는 회원이 없습니다.</p>
      )}

      {members.length > 0 && (
        <ul className="flex flex-col divide-y-2 divide-pixel-ink border-2 border-pixel-ink">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 bg-surface p-3">
              {selectableActions.length > 0 && (
                <Checkbox
                  aria-label={`${m.nickname} 선택`}
                  checked={selected.has(m.id)}
                  onChange={() => toggle(m.id)}
                />
              )}
              <button
                type="button"
                onClick={() => setDetailId(m.id)}
                className="flex min-w-0 flex-1 flex-col items-start text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="max-w-full truncate text-sm font-bold">{m.nickname}</span>
                <span className="max-w-full truncate text-xs text-foreground/60">{m.email}</span>
                <span className="text-xs text-foreground/50">
                  {m.signupMethod === "GOOGLE" ? "Google" : "이메일"} · {formatDate(m.createdAt)}
                </span>
              </button>
              <div className="flex gap-2">
                {(m.deleted ? [] : ROW_ACTIONS[m.status]).map((action) => (
                  <Button
                    key={action}
                    size="sm"
                    variant={action === "APPROVE" || action === "RESTORE" ? "secondary" : "danger"}
                    disabled={review.isPending}
                    onClick={() => openAction(action, [m])}
                  >
                    {ACTION_LABELS[action]}
                  </Button>
                ))}
                {m.deleted ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={setDeleted.isPending}
                    onClick={() => setDeleted.mutate({ userId: m.id, action: "RESTORE" })}
                  >
                    계정 복구
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReason("");
                      setDeleteTarget(m);
                    }}
                  >
                    삭제
                  </Button>
                )}
              </div>
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

      <Modal
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title={pendingAction ? `${ACTION_LABELS[pendingAction.action]} 확인` : undefined}
      >
        {pendingAction && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              {pendingAction.members.length === 1
                ? `${pendingAction.members[0].email} 계정을`
                : `선택한 ${pendingAction.members.length}명을`}{" "}
              {ACTION_LABELS[pendingAction.action]}할까요?
              {pendingAction.action === "REJECT" && (
                <span className="mt-1 block text-xs text-error">
                  거절된 계정은 다시 신청할 수 없습니다.
                </span>
              )}
            </p>
            <Textarea
              label="사유 (선택)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingAction(null)}>
                취소
              </Button>
              <Button variant="danger" loading={review.isPending} onClick={confirmAction}>
                {ACTION_LABELS[pendingAction.action]}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="회원 삭제">
        {deleteTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              {deleteTarget.email} 계정을 삭제할까요?
              <span className="mt-1 block text-xs text-foreground/60">
                삭제된 계정은 로그인할 수 없고 같은 이메일로 다시 가입할 수 없습니다. 데이터는 남아
                있어 &quot;삭제됨&quot; 탭에서 복구할 수 있습니다.
              </span>
            </p>
            <Textarea
              label="사유 (선택)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                취소
              </Button>
              <Button
                variant="danger"
                loading={setDeleted.isPending}
                onClick={() =>
                  setDeleted.mutate({
                    userId: deleteTarget.id,
                    action: "DELETE",
                    reason: reason.trim() || undefined,
                  })
                }
              >
                삭제
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <MemberDetailModal userId={detailId} onClose={() => setDetailId(null)} />
    </Card>
  );
}

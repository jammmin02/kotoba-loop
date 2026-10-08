"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AUDIT_ACTION_LABELS } from "@/components/admin/admin-audit-view";
import { REPORT_REASON_LABELS } from "@/components/admin/report-labels";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { AdminMemberDetail, AdminUserStatus, ReportStatus } from "@/types/admin";

const STATUS_LABELS: Record<AdminUserStatus, string> = {
  PENDING: "승인 대기",
  APPROVED: "승인",
  REJECTED: "거절",
  SUSPENDED: "정지",
};

const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  OPEN: "대기",
  RESOLVED: "처리됨",
  DISMISSED: "기각",
};

type SanctionAction = "WARN" | "RESTRICT_1D" | "RESTRICT_7D" | "RESTRICT_30D" | "LIFT_RESTRICTION";

const SANCTION_OPTIONS: { value: SanctionAction; label: string }[] = [
  { value: "WARN", label: "경고" },
  { value: "RESTRICT_1D", label: "작성 제한 1일" },
  { value: "RESTRICT_7D", label: "작성 제한 7일" },
  { value: "RESTRICT_30D", label: "작성 제한 30일" },
  { value: "LIFT_RESTRICTION", label: "작성 제한 해제" },
];

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <dt className="w-24 shrink-0 font-bold text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

export function MemberDetailModal({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [sanction, setSanction] = useState<SanctionAction>("WARN");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "member", userId],
    queryFn: () => apiFetch<AdminMemberDetail>(`/api/admin/members/${userId}`),
    enabled: userId !== null,
  });

  const apply = useMutation({
    mutationFn: (action: SanctionAction) =>
      apiFetch<{ ok: true }>("/api/admin/members/sanction", {
        method: "POST",
        body: { userId, action },
      }),
    onSuccess: () => {
      toast.success("적용했습니다.");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "처리에 실패했습니다.");
    },
  });

  const restricted =
    data?.writeRestrictedUntil && new Date(data.writeRestrictedUntil) > new Date()
      ? data.writeRestrictedUntil
      : null;

  return (
    <Modal open={userId !== null} onClose={onClose} title="회원 상세">
      {isLoading && <p className="text-sm text-muted">불러오는 중...</p>}
      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "불러오지 못했습니다."}
        </p>
      )}
      {data && (
        <div className="flex flex-col gap-4">
          <dl className="flex flex-col gap-2">
            <Row label="닉네임" value={data.nickname} />
            <Row label="이메일" value={data.email} />
            <Row label="상태" value={STATUS_LABELS[data.status]} />
            <Row label="가입 방식" value={data.signupMethod === "GOOGLE" ? "Google" : "이메일"} />
            <Row label="가입일" value={formatDateTime(data.createdAt)} />
            <Row label="마지막 활동" value={formatDateTime(data.lastActiveAt)} />
            <Row label="JLPT 레벨" value={data.jlptLevel ?? "-"} />
            <Row label="목표 JLPT" value={data.targetJlpt ?? "-"} />
            <Row
              label="하루 목표"
              value={data.dailyWordTarget ? `${data.dailyWordTarget}단어` : "-"}
            />
            <Row
              label="학습 목적"
              value={data.purpose.length > 0 ? data.purpose.join(", ") : "-"}
            />
            <Row label="단어장" value={`${data.vocabularyBookCount}개`} />
            {data.reviewedAt && <Row label="처리일" value={formatDateTime(data.reviewedAt)} />}
            {data.rejectReason && <Row label="거절 사유" value={data.rejectReason} />}
          </dl>

          <section className="flex flex-col gap-2 border-t-2 border-pixel-ink pt-3">
            <h3 className="text-sm font-bold">제재 현황</h3>
            <dl className="flex flex-col gap-2">
              <Row label="경고" value={`${data.warningCount}회`} />
              <Row
                label="작성 제한"
                value={restricted ? `${formatDateTime(restricted)}까지` : "없음"}
              />
            </dl>

            {data.role === "USER" && (
              <div className="flex items-end gap-2">
                <Select
                  label="제재 적용"
                  value={sanction}
                  onChange={(e) => setSanction(e.target.value as SanctionAction)}
                  options={SANCTION_OPTIONS}
                  className="flex-1"
                />
                <Button
                  variant={sanction === "LIFT_RESTRICTION" ? "secondary" : "danger"}
                  loading={apply.isPending}
                  onClick={() => apply.mutate(sanction)}
                >
                  적용
                </Button>
              </div>
            )}
            <p className="text-xs text-muted">
              단계: 경고 → 작성 제한 → 정지(회원 관리 목록에서 처리)
            </p>

            {data.sanctionHistory.length > 0 && (
              <ul className="flex flex-col gap-1 text-xs">
                {data.sanctionHistory.map((h) => (
                  <li key={h.id} className="text-muted">
                    {formatDateTime(h.createdAt)} · {AUDIT_ACTION_LABELS[h.action]}
                    {h.reason && ` (${h.reason})`}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2 border-t-2 border-pixel-ink pt-3">
            <h3 className="text-sm font-bold">관련 신고</h3>
            {data.relatedReports.length === 0 ? (
              <p className="text-xs text-muted">접수된 신고가 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-xs">
                {data.relatedReports.map((r) => (
                  <li key={r.id} className="text-muted">
                    {formatDateTime(r.createdAt)} · 「{r.targetLabel}」 ·{" "}
                    {REPORT_REASON_LABELS[r.reason]} · {REPORT_STATUS_LABELS[r.status]}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}

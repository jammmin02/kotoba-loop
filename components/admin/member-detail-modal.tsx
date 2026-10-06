"use client";

import { useQuery } from "@tanstack/react-query";

import { Modal } from "@/components/ui/modal";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { AdminMemberDetail, AdminUserStatus } from "@/types/admin";

const STATUS_LABELS: Record<AdminUserStatus, string> = {
  PENDING: "승인 대기",
  APPROVED: "승인",
  REJECTED: "거절",
  SUSPENDED: "정지",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <dt className="w-24 shrink-0 font-bold text-foreground/60">{label}</dt>
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
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "member", userId],
    queryFn: () => apiFetch<AdminMemberDetail>(`/api/admin/members/${userId}`),
    enabled: userId !== null,
  });

  return (
    <Modal open={userId !== null} onClose={onClose} title="회원 상세">
      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}
      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "불러오지 못했습니다."}
        </p>
      )}
      {data && (
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
          <Row label="학습 목적" value={data.purpose.length > 0 ? data.purpose.join(", ") : "-"} />
          <Row label="단어장" value={`${data.vocabularyBookCount}개`} />
          {data.reviewedAt && <Row label="처리일" value={formatDateTime(data.reviewedAt)} />}
          {data.rejectReason && <Row label="거절 사유" value={data.rejectReason} />}
        </dl>
      )}
    </Modal>
  );
}

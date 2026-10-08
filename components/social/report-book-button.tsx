"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { PixelFlag } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip-button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { REPORT_DETAIL_MAX } from "@/lib/validations/moderation";

type Reason = "SPAM" | "ABUSE" | "INAPPROPRIATE" | "OTHER";

const REASONS: { value: Reason; label: string }[] = [
  { value: "SPAM", label: "스팸·광고" },
  { value: "ABUSE", label: "욕설·비방" },
  { value: "INAPPROPRIATE", label: "부적절한 내용" },
  { value: "OTHER", label: "기타" },
];

export function ReportBookButton({ bookId }: { bookId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("INAPPROPRIATE");
  const [detail, setDetail] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>("/api/reports", {
        method: "POST",
        body: { targetType: "BOOK", targetId: bookId, reason, detail: detail.trim() || undefined },
      }),
    onSuccess: () => {
      toast.success("신고가 접수되었습니다. 관리자가 확인할게요.");
      setOpen(false);
      setDetail("");
    },
    onError: (err) => {
      // 이미 신고한 경우는 오류가 아니라 안내로 보여준다.
      if (err instanceof ApiClientError && err.code === "CONFLICT") {
        toast.info(err.message);
        setOpen(false);
        return;
      }
      toast.error(err instanceof ApiClientError ? err.message : "신고 중 오류가 발생했습니다.");
    },
  });

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <PixelFlag className="size-4" aria-hidden="true" />
        신고
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="단어장 신고">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-content text-muted">
            신고 사유를 선택해주세요. 관리자가 확인한 뒤 조치합니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <ChipButton
                key={r.value}
                selected={reason === r.value}
                onClick={() => setReason(r.value)}
              >
                {r.label}
              </ChipButton>
            ))}
          </div>
          <Textarea
            label="상세 내용 (선택)"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={REPORT_DETAIL_MAX}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button variant="danger" loading={mutation.isPending} onClick={() => mutation.mutate()}>
              신고하기
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

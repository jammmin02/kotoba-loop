"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import {
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  announcementInputSchema,
} from "@/lib/validations/announcement";
import type { AdminAnnouncement, AnnouncementLevel } from "@/types/announcement";

interface FormState {
  id: string | null;
  title: string;
  body: string;
  level: AnnouncementLevel;
  startsAt: string;
  endsAt: string;
  isPinned: boolean;
}

const PHASE_LABELS: Record<AdminAnnouncement["phase"], string> = {
  ACTIVE: "노출 중",
  SCHEDULED: "예정",
  ENDED: "종료",
};

/** ISO 시각 → <input type="datetime-local"> 값(브라우저 로컬 시간) */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  body: "",
  level: "INFO",
  startsAt: "",
  endsAt: "",
  isPinned: false,
};

export function AdminAnnouncementsView() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string>();
  const [deleting, setDeleting] = useState<AdminAnnouncement | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: () => apiFetch<AdminAnnouncement[]>("/api/admin/announcements"),
  });

  const save = useMutation({
    mutationFn: (state: FormState) => {
      const body = {
        title: state.title,
        body: state.body,
        level: state.level,
        startsAt: fromLocalInput(state.startsAt),
        endsAt: fromLocalInput(state.endsAt),
        isPinned: state.isPinned,
      };
      return state.id
        ? apiFetch<AdminAnnouncement>(`/api/admin/announcements/${state.id}`, {
            method: "PATCH",
            body,
          })
        : apiFetch<AdminAnnouncement>("/api/admin/announcements", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success("저장했습니다.");
      setForm(null);
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (err) => {
      setFormError(err instanceof ApiClientError ? err.message : "저장에 실패했습니다.");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/admin/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("삭제했습니다.");
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "삭제에 실패했습니다.");
    },
  });

  function submit() {
    if (!form) return;
    // 서버와 같은 스키마로 먼저 검사해 오류를 바로 보여준다.
    const parsed = announcementInputSchema.safeParse({
      title: form.title,
      body: form.body,
      level: form.level,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      isPinned: form.isPinned,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message);
      return;
    }
    setFormError(undefined);
    save.mutate(form);
  }

  function openForm(next: FormState) {
    setFormError(undefined);
    setForm(next);
  }

  return (
    <Card
      variant="elevated"
      title="NOTICE.EXE"
      titleColor="accent"
      className="flex flex-col gap-4 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold">공지 관리</h1>
        <Button size="sm" onClick={() => openForm(EMPTY_FORM)}>
          새 공지
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted">불러오는 중...</p>}
      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "불러오지 못했습니다."}
        </p>
      )}
      {data && data.length === 0 && <p className="text-sm text-muted">공지가 없습니다.</p>}

      {data?.map((a) => (
        <div key={a.id} className="flex flex-col gap-2 border-2 border-pixel-ink bg-surface p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border-2 border-pixel-ink bg-background px-2 py-0.5 text-xs font-bold">
              {PHASE_LABELS[a.phase]}
            </span>
            {a.level === "WARNING" && (
              <span className="border-2 border-pixel-ink bg-warning px-2 py-0.5 text-xs font-bold text-warning-foreground">
                경고
              </span>
            )}
            {a.isPinned && (
              <span className="border-2 border-pixel-ink bg-background px-2 py-0.5 text-xs font-bold">
                고정
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{a.title}</span>
          </div>
          <p className="line-clamp-2 whitespace-pre-line text-sm font-content text-muted">
            {a.body}
          </p>
          <p className="text-xs text-muted">
            {formatDateTime(a.startsAt)} ~ {a.endsAt ? formatDateTime(a.endsAt) : "계속"}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                openForm({
                  id: a.id,
                  title: a.title,
                  body: a.body,
                  level: a.level,
                  startsAt: toLocalInput(a.startsAt),
                  endsAt: toLocalInput(a.endsAt),
                  isPinned: a.isPinned,
                })
              }
            >
              수정
            </Button>
            <Button size="sm" variant="danger" onClick={() => setDeleting(a)}>
              삭제
            </Button>
          </div>
        </div>
      ))}

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "공지 수정" : "새 공지"}
      >
        {form && (
          <div className="flex flex-col gap-4">
            <Input
              label="제목"
              value={form.title}
              maxLength={ANNOUNCEMENT_TITLE_MAX}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Textarea
              label="내용"
              value={form.body}
              maxLength={ANNOUNCEMENT_BODY_MAX}
              rows={4}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <div className="flex gap-2">
              <ChipButton
                selected={form.level === "INFO"}
                onClick={() => setForm({ ...form, level: "INFO" })}
              >
                일반
              </ChipButton>
              <ChipButton
                selected={form.level === "WARNING"}
                onClick={() => setForm({ ...form, level: "WARNING" })}
              >
                경고
              </ChipButton>
            </div>
            <Input
              label="노출 시작 (비우면 지금)"
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
            <Input
              label="노출 종료 (비우면 계속)"
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            />
            <Checkbox
              label="상단 고정"
              checked={form.isPinned}
              onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
            />
            {formError && (
              <p role="alert" className="text-sm text-error">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setForm(null)}>
                취소
              </Button>
              <Button loading={save.isPending} onClick={submit}>
                저장
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={deleting !== null} onClose={() => setDeleting(null)} title="공지 삭제">
        {deleting && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">「{deleting.title}」 공지를 삭제할까요? 되돌릴 수 없습니다.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleting(null)}>
                취소
              </Button>
              <Button
                variant="danger"
                loading={remove.isPending}
                onClick={() => remove.mutate(deleting.id)}
              >
                삭제
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

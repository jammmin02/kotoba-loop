"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { AdminContentList, AdminContentRow } from "@/types/admin";

type Filter = "all" | "visible" | "hidden";
type Action = "HIDE" | "RESTORE" | "DELETE";

const FILTERS: { filter: Filter; label: string }[] = [
  { filter: "all", label: "전체" },
  { filter: "visible", label: "노출 중" },
  { filter: "hidden", label: "숨김" },
];

const ACTION_LABELS: Record<Action, string> = { HIDE: "숨김", RESTORE: "복구", DELETE: "삭제" };

export function AdminContentView() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<{ book: AdminContentRow; action: Action } | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "content", filter, q, page],
    queryFn: () => {
      const params = new URLSearchParams({ filter, page: String(page) });
      if (q) params.set("q", q);
      return apiFetch<AdminContentList>(`/api/admin/content?${params}`);
    },
  });

  const act = useMutation({
    mutationFn: (input: { bookId: string; action: Action; reason?: string }) =>
      apiFetch<{ ok: true }>("/api/admin/content/action", { method: "POST", body: input }),
    onSuccess: (_result, input) => {
      toast.success(`${ACTION_LABELS[input.action]} 처리했습니다.`);
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "처리에 실패했습니다.");
    },
  });

  function request(book: AdminContentRow, action: Action) {
    // 복구는 되돌리기 쉬워 바로 처리하고, 숨김·삭제는 사유 입력과 확인을 거친다.
    if (action === "RESTORE") {
      act.mutate({ bookId: book.id, action });
      return;
    }
    setReason("");
    setPending({ book, action });
  }

  return (
    <Card
      variant="elevated"
      title="CONTENT.EXE"
      titleColor="mint"
      className="flex flex-col gap-4 p-4"
    >
      <h1 className="text-lg font-bold">콘텐츠 관리</h1>
      <p className="text-xs text-muted">공개 단어장과 숨김 처리된 단어장이 표시됩니다.</p>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <ChipButton
            key={f.filter}
            selected={filter === f.filter}
            onClick={() => {
              setFilter(f.filter);
              setPage(1);
            }}
          >
            {f.label}
          </ChipButton>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(searchInput.trim());
          setPage(1);
        }}
      >
        <Input
          aria-label="콘텐츠 검색"
          placeholder="이름, 설명, 작성자 검색"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="outline">
          검색
        </Button>
      </form>

      {isLoading && <p className="text-sm text-muted">불러오는 중...</p>}
      {isError && (
        <p role="alert" className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "불러오지 못했습니다."}
        </p>
      )}
      {data && data.books.length === 0 && (
        <p className="text-sm text-muted">해당하는 단어장이 없습니다.</p>
      )}

      {data?.books.map((book) => (
        <div key={book.id} className="flex flex-col gap-2 border-2 border-pixel-ink bg-surface p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{book.name}</p>
              <p className="text-xs text-muted">
                {book.owner.nickname} · {book.owner.email} · 단어 {book.wordCount}개 · 가져감{" "}
                {book.importCount}회
              </p>
            </div>
            <div className="flex gap-1">
              {book.hidden && (
                <span className="border-2 border-pixel-ink bg-warning px-2 py-0.5 text-xs font-bold text-warning-foreground">
                  숨김
                </span>
              )}
              {!book.isPublic && (
                <span className="border-2 border-pixel-ink bg-background px-2 py-0.5 text-xs font-bold">
                  비공개
                </span>
              )}
              {book.openReportCount > 0 && (
                <span className="border-2 border-pixel-ink bg-error px-2 py-0.5 text-xs font-bold text-error-foreground">
                  신고 {book.openReportCount}
                </span>
              )}
            </div>
          </div>
          {book.description && (
            <p className="line-clamp-2 text-sm font-content text-muted">
              {book.description}
            </p>
          )}
          {book.hideReason && (
            <p className="text-xs text-muted">숨김 사유: {book.hideReason}</p>
          )}
          <div className="flex justify-end gap-2">
            {book.hidden ? (
              <Button size="sm" variant="secondary" onClick={() => request(book, "RESTORE")}>
                복구
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => request(book, "HIDE")}>
                숨김
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={() => request(book, "DELETE")}>
              삭제
            </Button>
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

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending ? `${ACTION_LABELS[pending.action]} 확인` : undefined}
      >
        {pending && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              「{pending.book.name}」을(를) {ACTION_LABELS[pending.action]}할까요?
              {pending.action === "DELETE" && (
                <span className="mt-1 block text-xs font-bold text-error">
                  삭제한 단어장은 복구할 수 없습니다. 이 단어장을 이미 가져간 사용자의 복사본은
                  유지됩니다.
                </span>
              )}
            </p>
            <Textarea
              label={pending.action === "HIDE" ? "숨김 사유 (작성자에게 보입니다)" : "사유 (선택)"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPending(null)}>
                취소
              </Button>
              <Button
                variant={pending.action === "DELETE" ? "danger" : "primary"}
                loading={act.isPending}
                onClick={() =>
                  act.mutate({
                    bookId: pending.book.id,
                    action: pending.action,
                    reason: reason.trim() || undefined,
                  })
                }
              >
                {ACTION_LABELS[pending.action]}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

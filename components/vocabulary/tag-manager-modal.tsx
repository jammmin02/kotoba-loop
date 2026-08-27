"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PixelTrash } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { TAG_NAME_MAX } from "@/lib/validations/tag";
import type { TagSummary } from "@/types/tag";

import type { FormEvent } from "react";

interface TagManagerModalProps {
  open: boolean;
  onClose: () => void;
}

export function TagManagerModal({ open, onClose }: TagManagerModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [pendingDeleteId, setPendingDeleteId] = useState<string>();

  const {
    data: tags,
    isLoading,
    isError,
    error: fetchError,
  } = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiFetch<TagSummary[]>("/api/tags"),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (tagName: string) =>
      apiFetch<TagSummary>("/api/tags", { method: "POST", body: { name: tagName } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setName("");
      setError(undefined);
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : "태그 생성에 실패했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/tags?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
      toast.success("태그를 삭제했습니다.");
      setPendingDeleteId(undefined);
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "태그 삭제에 실패했습니다.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  }

  function handleClose() {
    setPendingDeleteId(undefined);
    setError(undefined);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="태그 관리">
      <div className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="새 태그 이름"
            maxLength={TAG_NAME_MAX}
            className="flex-1"
          />
          <Button type="submit" size="sm" loading={createMutation.isPending}>
            추가
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}

        {isError && (
          <p className="text-sm text-error">
            {fetchError instanceof ApiClientError
              ? fetchError.message
              : "태그를 불러오지 못했습니다."}
          </p>
        )}

        {tags && tags.length === 0 && (
          <p className="text-sm text-foreground/50">등록된 태그가 없어요.</p>
        )}

        {tags && tags.length > 0 && (
          <ul className="flex flex-col gap-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center justify-between gap-2 border-2 border-pixel-ink bg-background px-3 py-2"
              >
                <span className="text-sm font-bold text-foreground">#{tag.name}</span>
                {pendingDeleteId === tag.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-foreground/60">삭제할까요?</span>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => deleteMutation.mutate(tag.id)}
                      loading={deleteMutation.isPending}
                    >
                      삭제
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingDeleteId(undefined)}
                    >
                      취소
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(tag.id)}
                    aria-label={`${tag.name} 태그 삭제`}
                    className="text-foreground/40 hover:text-error"
                  >
                    <PixelTrash className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

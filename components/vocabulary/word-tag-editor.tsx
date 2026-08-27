"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { PixelPlus } from "@/components/icons/pixel-icons";
import { TagBadge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { TagSummary } from "@/types/tag";

interface WordTagEditorProps {
  vocabularyId: string;
  initialTags: TagSummary[];
}

export function WordTagEditor({ vocabularyId, initialTags }: WordTagEditorProps) {
  const [tags, setTags] = useState(initialTags);
  const [prevInitialTags, setPrevInitialTags] = useState(initialTags);
  if (initialTags !== prevInitialTags) {
    setPrevInitialTags(initialTags);
    setTags(initialTags);
  }
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerOpen]);

  const {
    data: allTags,
    isLoading: isTagsLoading,
    isError: isTagsError,
  } = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiFetch<TagSummary[]>("/api/tags"),
    enabled: pickerOpen,
  });

  const attachMutation = useMutation({
    mutationFn: (tagId: string) =>
      apiFetch<{ tags: TagSummary[] }>(`/api/vocabularies/${vocabularyId}/tags`, {
        method: "POST",
        body: { tagId },
      }),
    onSuccess: (data) => {
      setTags(data.tags);
      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
      setPickerOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "태그 추가에 실패했습니다.");
    },
  });

  const detachMutation = useMutation({
    mutationFn: (tagId: string) =>
      apiFetch<{ tags: TagSummary[] }>(`/api/vocabularies/${vocabularyId}/tags?tagId=${tagId}`, {
        method: "DELETE",
      }),
    onSuccess: (data) => {
      setTags(data.tags);
      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "태그 해제에 실패했습니다.");
    },
  });

  const availableTags = (allTags ?? []).filter(
    (tag) => !tags.some((existing) => existing.id === tag.id),
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <TagBadge key={tag.id} name={tag.name} onRemove={() => detachMutation.mutate(tag.id)} />
      ))}
      <div ref={pickerRef} className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((prev) => !prev)}
          className="flex items-center gap-1 border-2 border-dashed border-pixel-ink/40 px-2 py-0.5 text-xs font-bold text-foreground/50 hover:border-solid hover:text-foreground"
        >
          <PixelPlus className="size-3" aria-hidden="true" />
          태그
        </button>
        {pickerOpen && (
          <div className="absolute left-0 top-full z-10 mt-1 flex min-w-32 flex-col gap-0.5 border-2 border-pixel-ink bg-surface p-1.5 shadow-pixel-sm">
            {isTagsLoading ? (
              <p className="whitespace-nowrap px-1.5 py-1 text-xs text-foreground/50">
                불러오는 중...
              </p>
            ) : isTagsError ? (
              <p className="whitespace-nowrap px-1.5 py-1 text-xs text-error">
                태그를 불러오지 못했어요
              </p>
            ) : availableTags.length === 0 ? (
              <p className="whitespace-nowrap px-1.5 py-1 text-xs text-foreground/50">
                {allTags?.length ? "추가할 태그가 없어요" : "등록된 태그가 없어요"}
              </p>
            ) : (
              availableTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => attachMutation.mutate(tag.id)}
                  disabled={attachMutation.isPending}
                  className="whitespace-nowrap px-1.5 py-1 text-left text-xs font-bold text-foreground/70 hover:bg-background disabled:opacity-50"
                >
                  #{tag.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

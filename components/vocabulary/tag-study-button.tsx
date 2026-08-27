"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { PixelSparkles } from "@/components/icons/pixel-icons";
import { buttonVariants } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { VocabularySummary } from "@/types/vocabulary";

export interface TagStudyButtonProps {
  tagId: string;
  tagName: string;
}

/**
 * PROMPT 18: 단어 목록의 태그 필터와는 독립적으로, 이 태그를 가진 전체 단어 수를
 * 자체 조회해 학습 세션 시작을 막을지 판단한다(다른 필터가 함께 켜져 있어도 무관하게).
 */
export function TagStudyButton({ tagId, tagName }: TagStudyButtonProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["vocabularies", "tag-count", tagId],
    queryFn: () => apiFetch<VocabularySummary[]>(`/api/vocabularies?tagId=${tagId}`),
  });

  const count = data?.length ?? 0;

  if (isLoading || isError || count === 0) {
    const title = isLoading
      ? undefined
      : isError
        ? "단어 수를 확인하지 못했어요."
        : "이 태그에 등록된 단어가 없어요.";
    return (
      <span
        aria-disabled="true"
        title={title}
        className={cn(buttonVariants({ variant: "quest", size: "md" }), "pointer-events-none opacity-50")}
      >
        <PixelSparkles className="size-4" aria-hidden="true" />이 태그로 학습하기
      </span>
    );
  }

  return (
    <Link
      href={`/study/session?tagId=${tagId}&tagName=${encodeURIComponent(tagName)}`}
      className={cn(buttonVariants({ variant: "quest", size: "md" }))}
    >
      <PixelSparkles className="size-4" aria-hidden="true" />이 태그로 학습하기 ({count})
    </Link>
  );
}

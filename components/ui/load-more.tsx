"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

interface LoadMoreProps {
  hasMore: boolean;
  /** 아직 그리지 않은 항목 수 — 버튼 문구에 쓴다. */
  remaining: number;
  /** 지금까지 그린 항목 수 — 바뀔 때마다 감시를 다시 걸어, 목록이 짧아 센티널이 계속 보이면 이어서 불러온다. */
  shownCount: number;
  onLoadMore: () => void;
}

/**
 * 목록 끝의 센티널. 화면 아래 600px 안으로 들어오면 자동으로 다음 묶음을 불러오고, 스크롤을
 * 못 쓰거나 IntersectionObserver가 없는 환경(키보드/스크린리더 사용자 포함)을 위해 "더 보기"
 * 버튼도 함께 둔다.
 */
export function LoadMore({ hasMore, remaining, shownCount, onLoadMore }: LoadMoreProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  });

  useEffect(() => {
    const node = sentinelRef.current;
    if (!hasMore || !node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMoreRef.current();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, shownCount]);

  if (!hasMore) return null;

  return (
    <div ref={sentinelRef} className="flex justify-center py-2">
      <Button type="button" variant="outline" size="sm" onClick={onLoadMore}>
        더 보기 ({remaining}개 남음)
      </Button>
    </div>
  );
}

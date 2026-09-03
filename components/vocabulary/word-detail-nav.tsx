"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

import type { ReactNode, TouchEvent } from "react";

const SWIPE_THRESHOLD_PX = 60;

interface WordDetailNavProps {
  prevHref: string | null;
  nextHref: string | null;
  className?: string;
  children: ReactNode;
}

/** Wraps the word detail content with swipe (touch) and ArrowLeft/ArrowRight navigation. */
export function WordDetailNav({ prevHref, nextHref, className, children }: WordDetailNavProps) {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      // 태그 입력, 문장 만들기 등 텍스트 입력 중에는 화살표 키를 그대로 입력에 맡긴다.
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft" && prevHref) {
        router.push(prevHref);
      } else if (event.key === "ArrowRight" && nextHref) {
        router.push(nextHref);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevHref, nextHref, router]);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;

    const endX = event.changedTouches[0]?.clientX ?? startX;
    const deltaX = endX - startX;
    if (deltaX >= SWIPE_THRESHOLD_PX && prevHref) {
      router.push(prevHref);
    } else if (deltaX <= -SWIPE_THRESHOLD_PX && nextHref) {
      router.push(nextHref);
    }
  }

  return (
    <div className={className} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {children}
    </div>
  );
}

interface WordDetailNavButtonsProps {
  prevHref: string | null;
  nextHref: string | null;
}

export function WordDetailNavButtons({ prevHref, nextHref }: WordDetailNavButtonsProps) {
  return (
    <div className="flex gap-2">
      {prevHref ? (
        <Link href={prevHref}>
          <Button type="button" variant="outline" size="sm">
            ← 이전 단어
          </Button>
        </Link>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled>
          ← 이전 단어
        </Button>
      )}
      {nextHref ? (
        <Link href={nextHref}>
          <Button type="button" variant="outline" size="sm">
            다음 단어 →
          </Button>
        </Link>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled>
          다음 단어 →
        </Button>
      )}
    </div>
  );
}

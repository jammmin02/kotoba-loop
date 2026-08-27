"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { WeakKanjiItem, WeakKanjiResponse } from "@/types/kanji";

function WeakKanjiRow({ item }: { item: WeakKanjiItem }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/kanji/${encodeURIComponent(item.character)}`}
          className="flex min-w-0 flex-1 items-baseline gap-2"
        >
          <span className="font-jp text-3xl font-bold text-foreground">{item.character}</span>
          <span className="truncate text-sm font-content text-foreground/60">{item.meaning}</span>
        </Link>
        <StatusBadge status="WEAK" className="shrink-0" />
      </div>
      <p className="border-t-2 border-pixel-ink pt-2 text-xs text-foreground/60">
        최근 {item.recentCount}회 중{" "}
        <span className="font-bold text-error">{item.recentWrongCount}회</span> 오답 · 오답률{" "}
        {item.wrongRate}%
      </p>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold text-foreground/60">추천 단어</p>
        {item.recommendations.length === 0 ? (
          <p className="text-xs text-foreground/50">추천할 새 단어가 없어요.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {item.recommendations.map((word) => (
              <li
                key={word.vocabularyId}
                className="flex items-baseline gap-1.5 border-2 border-pixel-ink bg-background px-2 py-1"
              >
                <span className="font-jp text-sm font-bold text-foreground">{word.word}</span>
                <span className="font-jp text-xs text-foreground/60">{word.reading}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/** 취약 한자 분석 섹션(PROMPT 40, 계획서 37장) — 최근 리뷰 중 반복 오답이 발생한 한자와
 *  아직 등록하지 않은 관련 단어를 추천한다. */
export function WeakKanjiCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["kanji", "weak"],
    queryFn: () => apiFetch<WeakKanjiResponse>("/api/kanji/weak"),
  });

  if (isLoading) {
    return (
      <Card title="취약 한자 분석" titleColor="pink">
        <p className="text-sm text-foreground/60">불러오는 중...</p>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card title="취약 한자 분석" titleColor="pink">
        <p className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "취약 한자 분석을 불러오지 못했습니다."}
        </p>
      </Card>
    );
  }

  if (data.items.length === 0) {
    return (
      <Card title="취약 한자 분석" titleColor="pink">
        <p className="text-sm text-foreground/60">
          아직 반복 오답이 발생한 한자가 없어요. 이대로 꾸준히 학습해봐요.
        </p>
      </Card>
    );
  }

  return (
    <Card title="취약 한자 분석" titleColor="pink" className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {data.items.map((item) => (
          <li key={item.kanjiId}>
            <WeakKanjiRow item={item} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

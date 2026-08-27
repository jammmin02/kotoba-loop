"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { PixelPenTool, PixelSearch } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip-button";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { KANJI_SCHOOL_GRADES } from "@/lib/validations/kanji";
import { JLPT_LEVEL_OPTIONS } from "@/lib/validations/vocabulary";
import type { PaginatedResponse } from "@/types/api";
import type { KanjiSummary } from "@/types/kanji";

import type { FormEvent } from "react";

interface KanjiListViewProps {
  initialQuery: string;
  initialGrade: string;
  initialJlpt: string;
}

type ClassificationTab = "grade" | "jlpt";

function gradeLabel(grade: number): string {
  return grade === 8 ? "중학교 이상" : `초등 ${grade}학년`;
}

export function KanjiListView({ initialQuery, initialGrade, initialJlpt }: KanjiListViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") ?? initialQuery;
  const grade = searchParams.get("grade") ?? initialGrade;
  const jlpt = searchParams.get("jlpt") ?? initialJlpt;
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const trimmedQuery = query.trim();

  // 계획서 32장: 常用漢字 학년과 JLPT 참고 분류는 서로 다른 기준이라 항상 하나만 켜져
  // 있어야 한다(API도 둘 다 오면 검증 에러) — 탭으로 어느 분류를 보는지 명확히 구분한다.
  const [tab, setTab] = useState<ClassificationTab>(jlpt ? "jlpt" : "grade");

  // Resyncs the input when the URL's `q` changes externally (back/forward, chip click)
  // without an effect — see https://react.dev/learn/you-might-not-need-an-effect
  const [inputValue, setInputValue] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    setInputValue(query);
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["kanji", trimmedQuery, grade, jlpt, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (trimmedQuery) params.set("q", trimmedQuery);
      if (grade) params.set("grade", grade);
      if (jlpt) params.set("jlpt", jlpt);
      params.set("page", String(page));
      return apiFetch<PaginatedResponse<KanjiSummary>>(`/api/kanji?${params}`);
    },
  });

  function goTo(
    nextQuery: string,
    nextClassification: { grade?: string; jlpt?: string },
    nextPage = 1,
  ) {
    const params = new URLSearchParams();
    const trimmed = nextQuery.trim();
    if (trimmed) params.set("q", trimmed);
    if (nextClassification.grade) params.set("grade", nextClassification.grade);
    if (nextClassification.jlpt) params.set("jlpt", nextClassification.jlpt);
    if (nextPage > 1) params.set("page", String(nextPage));
    router.push(`/kanji${params.toString() ? `?${params}` : ""}`);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    goTo(inputValue, tab === "grade" ? { grade } : { jlpt });
  }

  function selectTab(nextTab: ClassificationTab) {
    if (nextTab === tab) return;
    setTab(nextTab);
    goTo(trimmedQuery, {});
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-foreground">常用漢字</h1>
        <Link
          href="/kanji/draw"
          className="flex items-center gap-1.5 border-2 border-pixel-ink bg-surface px-3 py-1.5 text-xs font-bold text-foreground shadow-pixel-sm transition hover:bg-background"
        >
          <PixelPenTool className="size-3.5" aria-hidden="true" />
          손글씨로 검색
        </Link>
      </div>

      <form onSubmit={handleSubmit} role="search" className="flex gap-2">
        <div className="flex h-11 flex-1 items-center gap-2 border-2 border-pixel-ink bg-background px-3 shadow-bevel-sunken focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
          <PixelSearch className="size-4 shrink-0 text-foreground/50" aria-hidden="true" />
          <input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="한자, 음독/훈독, 한국 한자음, 뜻으로 검색"
            aria-label="한자 검색어"
            className="h-full w-full min-w-0 bg-transparent font-jp text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
          />
        </div>
        <Button type="submit">검색</Button>
      </form>

      <div role="tablist" aria-label="한자 분류 기준" className="flex gap-2 border-b-2 border-pixel-ink">
        {(
          [
            { key: "grade", label: "학년별" },
            { key: "jlpt", label: "JLPT" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => selectTab(t.key)}
            className={cn(
              "-mb-0.5 border-b-2 px-3 py-2 text-sm font-bold transition",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-foreground/50 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "grade" ? (
        <div className="flex flex-wrap gap-1.5">
          <ChipButton selected={!grade} onClick={() => goTo(trimmedQuery, {})}>
            전체
          </ChipButton>
          {KANJI_SCHOOL_GRADES.map((g) => (
            <ChipButton
              key={g}
              selected={grade === String(g)}
              onClick={() => goTo(trimmedQuery, { grade: String(g) })}
            >
              {gradeLabel(g)}
            </ChipButton>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <ChipButton selected={!jlpt} onClick={() => goTo(trimmedQuery, {})}>
            전체
          </ChipButton>
          {JLPT_LEVEL_OPTIONS.map((level) => (
            <ChipButton
              key={level}
              selected={jlpt === level}
              onClick={() => goTo(trimmedQuery, { jlpt: level })}
            >
              {level}
            </ChipButton>
          ))}
        </div>
      )}

      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}

      {isError && (
        <p className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "한자를 불러오지 못했습니다."}
        </p>
      )}

      {data && data.items.length === 0 && (
        <div className="flex flex-col items-center gap-1 py-16 text-center">
          <p className="text-sm font-content text-foreground/70">조건에 맞는 한자가 없습니다.</p>
          <p className="text-xs font-content text-foreground/50">다른 검색어나 분류를 선택해보세요.</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-foreground/50">총 {data.total}자</p>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {data.items.map((kanji) => (
              <Link
                key={kanji.character}
                href={`/kanji/${encodeURIComponent(kanji.character)}`}
                className="flex flex-col items-center gap-1 border-2 border-pixel-ink bg-surface p-2 shadow-pixel-sm transition hover:bg-background"
              >
                <span className="font-jp text-2xl font-bold text-foreground">{kanji.character}</span>
                <span className="truncate text-[10px] text-foreground/60">{kanji.koreanReading}</span>
              </Link>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => goTo(trimmedQuery, tab === "grade" ? { grade } : { jlpt }, page - 1)}
              >
                이전
              </Button>
              <span className="text-sm text-foreground/60">
                {page} / {data.totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= data.totalPages}
                onClick={() => goTo(trimmedQuery, tab === "grade" ? { grade } : { jlpt }, page + 1)}
              >
                다음
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

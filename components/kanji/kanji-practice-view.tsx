"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  PixelDice,
  PixelGraduationCap,
  PixelInfo,
  PixelMinus,
  PixelPlus,
  PixelSearch,
  PixelStar,
  PixelX,
} from "@/components/icons/pixel-icons";
import { KanjiFavoriteToggle } from "@/components/kanji/kanji-favorite-toggle";
import { QuizSession } from "@/components/study/quiz-session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { KANJI_SCHOOL_GRADES } from "@/lib/validations/kanji";
import { JLPT_LEVEL_OPTIONS } from "@/lib/validations/vocabulary";
import type { KanjiPracticePoolItem, KanjiPracticePoolResponse } from "@/types/kanji";

type PracticeMode = "fullRandom" | "gradeJlpt" | "custom";
type ClassificationAxis = "grade" | "jlpt";
type JlptLevel = (typeof JLPT_LEVEL_OPTIONS)[number];

const COUNT_MIN = 10;
const COUNT_MAX = 50;
const COUNT_STEP = 5;
/** 검색/즐겨찾기 결과가 너무 많을 때 그리드 렌더링을 제한하는 상한 — 검색어를 좁히도록 유도한다. */
const CUSTOM_GRID_LIMIT = 60;

interface SelectedKanji {
  id: string;
  character: string;
}

function gradeLabel(grade: number): string {
  return grade === 8 ? "중학교 이상" : `초등 ${grade}학년`;
}

/** Fisher-Yates — 전체 랜덤/학년·JLPT 모드에서 뽑힌 후보 중 `count`개만 추려낼 때 쓴다. */
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * 한자 퀴즈에 "전체 랜덤 / 학년·JLPT 랜덤 / 커스텀 랜덤" 3가지 출제 모드를 선택하는 화면
 * (탭형 컨트롤 패널 안). `/kanji/quiz`의 "오늘의 한자"(SRS 큐, `KanjiQuizView`)와는 별개의
 * 연습 트랙 — 여기서 뽑은 id도 결국 같은 `QuizSession`/`POST /api/quiz/submit`을 타므로
 * 정답/오답은 오늘의 한자와 동일하게 학습 상태(SRS)에 그대로 반영된다.
 */
export function KanjiPracticeView() {
  const [mode, setMode] = useState<PracticeMode>("fullRandom");
  const [axis, setAxis] = useState<ClassificationAxis>("grade");
  const [gradeValue, setGradeValue] = useState<number | null>(null);
  const [jlptValue, setJlptValue] = useState<JlptLevel | null>(null);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selected, setSelected] = useState<SelectedKanji[]>([]);
  const [count, setCount] = useState(20);
  const [practiceIds, setPracticeIds] = useState<string[] | null>(null);

  const trimmedQuery = query.trim();

  const params = new URLSearchParams();
  let poolEnabled = true;
  if (mode === "fullRandom") {
    // 전체 랜덤/학년·JLPT는 아직 리뷰한 적 없는 한자까지 끌어와 오늘의 학습 페이싱을
    // 건너뛰지 않도록 이미 리뷰한 한자로만 제한한다 — 커스텀 모드는 의도적 선택이라 제외.
    params.set("seenOnly", "true");
  } else if (mode === "gradeJlpt") {
    if (axis === "grade" && gradeValue !== null) params.set("grade", String(gradeValue));
    else if (axis === "jlpt" && jlptValue) params.set("jlpt", jlptValue);
    else poolEnabled = false;
    params.set("seenOnly", "true");
  } else if (mode === "custom") {
    if (trimmedQuery) params.set("q", trimmedQuery);
    if (favoritesOnly) params.set("favoritesOnly", "true");
    if (!trimmedQuery && !favoritesOnly) poolEnabled = false;
  }

  const poolQuery = useQuery({
    queryKey: [
      "kanji",
      "practice-pool",
      mode,
      axis,
      gradeValue,
      jlptValue,
      trimmedQuery,
      favoritesOnly,
    ],
    queryFn: () => {
      const search = params.toString();
      return apiFetch<KanjiPracticePoolResponse>(`/api/kanji/practice-pool${search ? `?${search}` : ""}`);
    },
    enabled: poolEnabled,
  });

  if (practiceIds) {
    return (
      <QuizSession
        key="kanji-practice"
        targetIds={practiceIds}
        targetType="kanji"
        returnHref="/kanji"
        returnLabel="한자 목록으로 돌아가기"
      />
    );
  }

  const poolItems = poolQuery.data?.items ?? [];
  const canStart = mode === "custom" ? selected.length > 0 : poolEnabled && poolItems.length > 0;

  function toggleSelected(item: KanjiPracticePoolItem) {
    setSelected((prev) =>
      prev.some((s) => s.id === item.id)
        ? prev.filter((s) => s.id !== item.id)
        : [...prev, { id: item.id, character: item.character }],
    );
  }

  function handleStart() {
    if (!canStart) return;
    if (mode === "custom") {
      setPracticeIds(selected.map((s) => s.id));
      return;
    }
    setPracticeIds(shuffle(poolItems.map((item) => item.id)).slice(0, count));
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground">한자 퀴즈 만들기</h1>

      <Card variant="elevated" title="퀴즈 조건 설정" className="flex flex-col gap-0 p-0">
        <div className="flex flex-wrap gap-2 p-4">
          <ChipButton
            selected={mode === "fullRandom"}
            onClick={() => setMode("fullRandom")}
            className="flex items-center gap-1.5"
          >
            <PixelDice className="size-3.5" aria-hidden="true" />
            전체 랜덤
          </ChipButton>
          <ChipButton
            selected={mode === "gradeJlpt"}
            onClick={() => setMode("gradeJlpt")}
            className="flex items-center gap-1.5"
          >
            <PixelGraduationCap className="size-3.5" aria-hidden="true" />
            학년 · JLPT
          </ChipButton>
          <ChipButton
            selected={mode === "custom"}
            onClick={() => setMode("custom")}
            className="flex items-center gap-1.5"
          >
            <PixelStar className="size-3.5" aria-hidden="true" />
            커스텀
          </ChipButton>
        </div>

        <div className="flex flex-col gap-4 border-t-2 border-pixel-ink p-4">
          {mode === "fullRandom" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm leading-relaxed text-foreground/70">
                지금까지 한 번이라도 리뷰한 한자
                {poolQuery.isLoading ? "" : ` (총 ${poolItems.length}자)`} 중에서 완전히 무작위로
                뽑아요. 아직 배우지 않은 한자는 오늘의 학습에서 순서대로 만나요.
              </p>
              {!poolQuery.isLoading && poolItems.length === 0 && (
                <p className="text-sm text-foreground/50">
                  아직 리뷰한 한자가 없어요. 오늘의 학습을 먼저 시작해보세요!
                </p>
              )}
            </div>
          )}

          {mode === "gradeJlpt" && (
            <div className="flex flex-col gap-3">
              <div
                role="tablist"
                aria-label="한자 분류 기준"
                className="flex gap-2 border-b-2 border-pixel-ink"
              >
                {(
                  [
                    { key: "grade", label: "학년" },
                    { key: "jlpt", label: "JLPT" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={axis === t.key}
                    onClick={() => setAxis(t.key)}
                    className={cn(
                      "-mb-0.5 border-b-2 px-3 py-1.5 text-sm font-bold transition",
                      axis === t.key
                        ? "border-primary text-primary"
                        : "border-transparent text-foreground/50 hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {axis === "grade" ? (
                <div className="flex flex-wrap gap-1.5">
                  {KANJI_SCHOOL_GRADES.map((g) => (
                    <ChipButton key={g} selected={gradeValue === g} onClick={() => setGradeValue(g)}>
                      {gradeLabel(g)}
                    </ChipButton>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {JLPT_LEVEL_OPTIONS.map((level) => (
                    <ChipButton
                      key={level}
                      selected={jlptValue === level}
                      onClick={() => setJlptValue(level)}
                    >
                      {level}
                    </ChipButton>
                  ))}
                </div>
              )}

              {!poolEnabled && (
                <p className="text-xs text-foreground/50">먼저 학년이나 JLPT 급수를 골라주세요.</p>
              )}
              {poolEnabled && poolQuery.isLoading && (
                <p className="text-xs text-foreground/50">불러오는 중...</p>
              )}
              {poolEnabled && !poolQuery.isLoading && poolItems.length > 0 && (
                <p className="text-xs text-foreground/50">
                  지금까지 리뷰한 한자 중 지금 조건: 약 {poolItems.length}자
                </p>
              )}
              {poolEnabled && !poolQuery.isLoading && poolItems.length === 0 && (
                <p className="text-xs text-foreground/50">
                  이 조건에서 아직 리뷰한 한자가 없어요. 오늘의 학습을 먼저 시작해보세요!
                </p>
              )}
            </div>
          )}

          {mode === "custom" && (
            <div className="flex flex-col gap-3">
              <div className="flex h-11 items-center gap-2 border-2 border-pixel-ink bg-background px-3 shadow-bevel-sunken focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
                <PixelSearch className="size-4 shrink-0 text-foreground/50" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="한자, 뜻, 읽기로 검색"
                  aria-label="한자 검색어"
                  className="h-full w-full min-w-0 bg-transparent font-jp text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-foreground/60">직접 고르거나 즐겨찾기에서 골라보세요</span>
                <ChipButton
                  selected={favoritesOnly}
                  onClick={() => setFavoritesOnly((v) => !v)}
                  className="flex shrink-0 items-center gap-1"
                >
                  <PixelStar className="size-3" aria-hidden="true" />
                  즐겨찾기만
                </ChipButton>
              </div>

              {!poolEnabled && (
                <p className="py-4 text-center text-sm text-foreground/50">
                  검색하거나 즐겨찾기만 보기를 켜면 여기에 한자가 나와요.
                </p>
              )}
              {poolEnabled && poolQuery.isLoading && (
                <p className="text-sm text-foreground/60">불러오는 중...</p>
              )}
              {poolEnabled && !poolQuery.isLoading && poolItems.length === 0 && (
                <p className="py-4 text-center text-sm text-foreground/50">조건에 맞는 한자가 없어요.</p>
              )}

              {poolItems.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {poolItems.slice(0, CUSTOM_GRID_LIMIT).map((item) => {
                    const isSelected = selected.some((s) => s.id === item.id);
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleSelected(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSelected(item);
                          }
                        }}
                        aria-pressed={isSelected}
                        className={cn(
                          "relative flex aspect-square cursor-pointer items-center justify-center border-2 border-pixel-ink font-jp text-lg font-bold shadow-pixel-sm transition",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface text-foreground hover:bg-background",
                        )}
                      >
                        {item.character}
                        <KanjiFavoriteToggle
                          character={item.character}
                          isFavorite={item.isFavorite}
                          className="absolute top-0.5 right-0.5"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              {poolItems.length > CUSTOM_GRID_LIMIT && (
                <p className="text-xs text-foreground/50">
                  검색 결과가 {poolItems.length}자예요 · 검색어를 더 좁혀보세요
                </p>
              )}

              {selected.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 border-t-2 border-dashed border-pixel-ink/25 pt-3">
                  <span className="text-xs font-bold text-foreground">선택됨 {selected.length}개</span>
                  {selected.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelected((prev) => prev.filter((s) => s.id !== item.id))}
                      className="flex items-center gap-1 border-2 border-pixel-ink bg-surface px-2 py-0.5 text-xs font-bold shadow-pixel-sm"
                    >
                      {item.character}
                      <PixelX className="size-2.5" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-pixel-ink p-4">
          {mode !== "custom" ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">문항 수</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="문항 수 줄이기"
                  onClick={() => setCount((c) => Math.max(COUNT_MIN, c - COUNT_STEP))}
                >
                  <PixelMinus className="size-3" aria-hidden="true" />
                </Button>
                <span className="w-8 text-center text-sm font-bold text-foreground">{count}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="문항 수 늘리기"
                  onClick={() => setCount((c) => Math.min(COUNT_MAX, c + COUNT_STEP))}
                >
                  <PixelPlus className="size-3" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm font-bold text-foreground">
              선택한 {selected.length}자로 퀴즈를 만들어요
            </p>
          )}

          <div className="flex items-start gap-2 border-2 border-dashed border-pixel-ink/40 bg-background/60 p-2.5">
            <PixelInfo className="mt-0.5 size-3.5 shrink-0 text-foreground/50" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-foreground/60">
              이 연습 문제도 정답/오답이 학습 상태(취약 한자 판정 등)에 그대로 반영돼요.
            </p>
          </div>

          <Button type="button" variant="quest" size="lg" disabled={!canStart} onClick={handleStart}>
            퀴즈 시작
          </Button>
        </div>
      </Card>
    </div>
  );
}

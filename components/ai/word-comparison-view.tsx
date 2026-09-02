"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { PixelPlus } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CompareWordsResult } from "@/lib/ai/word-comparison";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { COMPARE_WORDS_MAX, COMPARE_WORDS_MIN } from "@/lib/validations/ai";
import type { VocabularySummary } from "@/types/vocabulary";

const inputClassName =
  "h-11 flex-1 border-2 border-pixel-ink bg-background px-3 text-sm text-foreground shadow-bevel-sunken focus:outline-none disabled:opacity-50";

export function WordComparisonView() {
  const [selected, setSelected] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [pickerQuery, setPickerQuery] = useState("");

  const vocabQuery = useQuery({
    queryKey: ["vocabularies", "all"],
    queryFn: () => apiFetch<VocabularySummary[]>("/api/vocabularies"),
  });

  const compareMutation = useMutation({
    mutationFn: (words: string[]) =>
      apiFetch<CompareWordsResult>("/api/ai/compare-words", {
        method: "POST",
        body: { words },
        timeoutMs: 30_000,
      }),
  });

  const canAddMore = selected.length < COMPARE_WORDS_MAX;

  function addWord(rawWord: string) {
    const word = rawWord.trim();
    if (!word || !canAddMore || selected.includes(word)) return;
    setSelected((prev) => [...prev, word]);
    compareMutation.reset();
  }

  function removeWord(word: string) {
    setSelected((prev) => prev.filter((w) => w !== word));
    compareMutation.reset();
  }

  function handleManualAdd() {
    addWord(manualInput);
    setManualInput("");
  }

  const filteredVocab = (vocabQuery.data ?? []).filter((word) => {
    if (selected.includes(word.word)) return false;
    const query = pickerQuery.trim();
    if (!query) return true;
    return word.word.includes(query) || word.reading.includes(query);
  });

  function handleCompare() {
    if (selected.length < COMPARE_WORDS_MIN) return;
    compareMutation.mutate(selected);
  }

  const data = compareMutation.data;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">표현 비교</h1>
        <p className="mt-1 text-sm font-content text-foreground/60">
          헷갈리는 단어를 {COMPARE_WORDS_MIN}~{COMPARE_WORDS_MAX}개 골라 뉘앙스 차이를 비교해봐요.
        </p>
      </div>

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground/70">
          선택한 단어 ({selected.length}/{COMPARE_WORDS_MAX})
        </p>
        {selected.length === 0 ? (
          <p className="text-sm text-foreground/50">
            아래에서 단어를 선택하거나 직접 입력해주세요.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1.5 border-2 border-pixel-ink bg-surface px-2.5 py-1 font-jp text-sm font-bold text-foreground"
              >
                {word}
                <button
                  type="button"
                  onClick={() => removeWord(word)}
                  aria-label={`${word} 선택 해제`}
                  className="text-foreground/50 hover:text-error"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground/70">직접 입력</p>
        <div className="flex gap-2">
          <input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleManualAdd();
              }
            }}
            placeholder="예: わざと"
            aria-label="비교할 단어 직접 입력"
            disabled={!canAddMore}
            className={inputClassName}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleManualAdd}
            disabled={!manualInput.trim() || !canAddMore}
          >
            추가
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground/70">내 단어장에서 선택</p>
        <input
          value={pickerQuery}
          onChange={(e) => setPickerQuery(e.target.value)}
          placeholder="단어 검색"
          aria-label="내 단어장에서 검색"
          className={inputClassName}
        />
        {vocabQuery.isLoading ? (
          <p className="text-sm text-foreground/60">불러오는 중...</p>
        ) : vocabQuery.isError ? (
          <p className="text-sm text-error">단어장을 불러오지 못했습니다.</p>
        ) : filteredVocab.length === 0 ? (
          <p className="text-sm text-foreground/50">표시할 단어가 없어요.</p>
        ) : (
          <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
            {filteredVocab.map((word) => (
              <li key={word.id}>
                <button
                  type="button"
                  onClick={() => addWord(word.word)}
                  disabled={!canAddMore}
                  className="flex w-full items-center justify-between gap-2 border-2 border-pixel-ink bg-background px-3 py-2 text-left transition hover:bg-surface disabled:opacity-50"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="font-jp font-bold text-foreground">{word.word}</span>
                    <span className="font-jp text-xs text-foreground/60">{word.reading}</span>
                  </span>
                  <PixelPlus className="size-3.5 shrink-0 text-foreground/50" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Button
        type="button"
        size="lg"
        onClick={handleCompare}
        disabled={selected.length < COMPARE_WORDS_MIN}
        loading={compareMutation.isPending}
      >
        비교하기
      </Button>

      {compareMutation.isError && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-error bg-error/10 p-3 text-sm text-error">
          <span role="alert">
            {compareMutation.error instanceof ApiClientError
              ? compareMutation.error.message
              : "비교 분석에 실패했습니다."}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={handleCompare}>
            다시 시도
          </Button>
        </div>
      )}

      {data && (
        <Card title="비교 결과" titleColor="pink" className="flex flex-col gap-4">
          {data.cached && (
            <span className="w-fit border-2 border-pixel-ink bg-surface px-2 py-0.5 text-xs font-bold text-foreground/60">
              캐시됨
            </span>
          )}
          <p className="text-sm font-content text-foreground/80">{data.result.summary}</p>
          <div className="flex flex-col gap-3">
            {data.result.items.map((item, index) => (
              <div
                key={`${item.word}-${index}`}
                className="flex flex-col gap-1.5 border-t-2 border-pixel-ink pt-3 first:border-t-0 first:pt-0"
              >
                <p className="font-jp text-lg font-bold text-foreground">{item.word}</p>
                <p className="text-sm font-content text-foreground/80">{item.nuance}</p>
                <div className="border-2 border-pixel-ink bg-background p-2.5">
                  <p className="font-jp text-sm text-foreground">{item.example.japanese}</p>
                  <p className="text-xs font-content text-foreground/60">{item.example.korean}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

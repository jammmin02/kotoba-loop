"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { HandwritingCanvas } from "@/components/kanji/handwriting-canvas";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { HandwritingRecognitionResult, HandwritingStroke } from "@/types/handwriting";

export function HandwritingSearchView() {
  const [result, setResult] = useState<HandwritingRecognitionResult | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: { strokes: HandwritingStroke[]; width: number; height: number }) =>
      apiFetch<HandwritingRecognitionResult>("/api/kanji/handwriting", {
        method: "POST",
        body: payload,
      }),
    onSuccess: setResult,
  });

  function handleRecognize(strokes: HandwritingStroke[], width: number, height: number) {
    setResult(null);
    mutation.mutate({ strokes, width, height });
  }

  const notFoundCandidates =
    result?.rawCandidates.filter((c) => !result.matches.some((m) => m.character === c)) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">손글씨로 한자 검색</h1>
        <p className="text-sm text-foreground/60">
          아래 칸에 한자를 손가락이나 마우스로 그리면 비슷한 한자를 찾아드려요.
        </p>
      </div>

      <HandwritingCanvas onRecognize={handleRecognize} recognizing={mutation.isPending} />

      {mutation.isError && (
        <p className="text-center text-sm text-error">
          {mutation.error instanceof ApiClientError
            ? mutation.error.message
            : "손글씨 인식에 실패했습니다."}
        </p>
      )}

      {result && result.matches.length === 0 && notFoundCandidates.length === 0 && (
        <p className="text-center text-sm text-foreground/60">
          일치하는 한자를 찾지 못했어요. 조금 더 크고 또박또박 그려보세요.
        </p>
      )}

      {result && result.matches.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-foreground/50">비슷한 한자 {result.matches.length}자</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {result.matches.map((kanji) => (
              <Link
                key={kanji.character}
                href={`/kanji/${encodeURIComponent(kanji.character)}`}
                className="flex flex-col items-center gap-1 border-2 border-pixel-ink bg-surface p-2 shadow-pixel-sm transition hover:bg-background"
              >
                <span className="font-jp text-2xl font-bold text-foreground">
                  {kanji.character}
                </span>
                <span className="truncate text-[10px] text-foreground/60">
                  {kanji.koreanReading}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {notFoundCandidates.length > 0 && (
        <p className="text-center text-xs text-foreground/40">
          常用漢字 목록에는 없는 후보: {notFoundCandidates.join(" ")}
        </p>
      )}
    </div>
  );
}

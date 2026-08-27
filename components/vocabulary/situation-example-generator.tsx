"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip-button";
import { toast } from "@/components/ui/toast";
import type { GenerateExampleResult } from "@/lib/ai/example-by-situation";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { SITUATION_OPTIONS } from "@/lib/validations/ai";
import type { Situation } from "@/lib/validations/ai";
import type { ExampleSentenceRecord } from "@/types/vocabulary";

interface SituationExampleGeneratorProps {
  vocabularyId: string;
}

export function SituationExampleGenerator({ vocabularyId }: SituationExampleGeneratorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [situation, setSituation] = useState<Situation>(SITUATION_OPTIONS[0]);
  const [preview, setPreview] = useState<GenerateExampleResult | null>(null);

  const generateMutation = useMutation({
    mutationFn: (target: Situation) =>
      apiFetch<GenerateExampleResult>(`/api/vocabularies/${vocabularyId}/ai-example`, {
        method: "POST",
        body: { situation: target },
      }),
    onSuccess: (data) => {
      setPreview(data);
    },
    onError: (err) => {
      setPreview(null);
      toast.error(err instanceof ApiClientError ? err.message : "예문 생성에 실패했습니다.");
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const result = preview?.result;
      if (!result) {
        throw new Error("생성된 예문이 없습니다.");
      }
      return apiFetch<ExampleSentenceRecord>(`/api/vocabularies/${vocabularyId}/examples`, {
        method: "POST",
        body: { japanese: result.japanese, korean: result.korean, source: preview.situation },
      });
    },
    onSuccess: () => {
      toast.success("예문을 추가했습니다.");
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
      router.refresh();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "예문 저장에 실패했습니다.");
    },
  });

  function handleGenerate() {
    generateMutation.mutate(situation);
  }

  function handleSituationChange(next: Situation) {
    setSituation(next);
    setPreview(null);
  }

  return (
    <div className="flex flex-col gap-3 border-t-2 border-pixel-ink pt-3">
      <h3 className="text-sm font-bold text-foreground/70">AI 예문 생성</h3>

      <div className="flex flex-wrap gap-1.5">
        {SITUATION_OPTIONS.map((option) => (
          <ChipButton
            key={option}
            type="button"
            selected={situation === option}
            onClick={() => handleSituationChange(option)}
          >
            {option}
          </ChipButton>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-fit"
        onClick={handleGenerate}
        loading={generateMutation.isPending}
      >
        {situation} 예문 생성
      </Button>

      {generateMutation.isError && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-error bg-error/10 p-3 text-sm text-error">
          <span>예문 생성에 실패했습니다.</span>
          <Button type="button" variant="outline" size="sm" onClick={handleGenerate}>
            다시 시도
          </Button>
        </div>
      )}

      {preview && (
        <div className="flex flex-col gap-2 border-2 border-pixel-ink bg-background p-3">
          <span className="w-fit border-2 border-pixel-ink bg-surface px-2 py-0.5 text-xs font-bold text-foreground/60">
            {preview.situation}
            {preview.cached && " · 캐시됨"}
          </span>
          <p className="font-jp text-foreground">{preview.result.japanese}</p>
          <p className="font-content text-sm text-foreground/60">{preview.result.korean}</p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="w-fit"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
          >
            추가하기
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMutation } from "@tanstack/react-query";

import { PixelSparkles, PixelSpinner } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { KanjiMnemonicResponse } from "@/types/kanji";

interface KanjiMnemonicCardProps {
  character: string;
}

/**
 * PROMPT 48(계획서 43장) — 한자 상세 페이지(PROMPT 34)에 얹는 "AI 기억법 보기" 섹션.
 * 페이지 로드 시 자동으로 호출하지 않고, 버튼을 눌렀을 때만 생성/조회한다(캐시가 있으면
 * 그대로 재사용되어 즉시 응답 — lib/ai/kanji-mnemonic.ts 참고). "다시 생성"은 별도
 * 버튼으로만 노출해 캐시를 우회하는 재호출이 실수로 일어나지 않게 한다.
 */
export function KanjiMnemonicCard({ character }: KanjiMnemonicCardProps) {
  const mutation = useMutation({
    mutationFn: (regenerate: boolean) =>
      apiFetch<KanjiMnemonicResponse>(`/api/kanji/${encodeURIComponent(character)}/mnemonic`, {
        method: "POST",
        body: { regenerate },
      }),
  });

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-foreground/70">AI 기억법</h2>

      {!mutation.isSuccess && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={mutation.isPending}
          loading={mutation.isPending}
          onClick={() => mutation.mutate(false)}
        >
          AI 기억법 보기
        </Button>
      )}

      {mutation.isPending && (
        <p className="flex items-center gap-1.5 text-sm text-foreground/60">
          <PixelSpinner className="size-3.5 animate-spin" aria-hidden="true" />
          기억법을 만드는 중...
        </p>
      )}

      {mutation.isError && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="text-foreground/60">
            {mutation.error instanceof ApiClientError
              ? mutation.error.message
              : "AI 기억법을 불러오지 못했습니다."}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => mutation.mutate(false)}>
            다시 시도
          </Button>
        </div>
      )}

      {mutation.isSuccess && (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2 border-2 border-pixel-ink bg-titlebar-mint/20 p-3 text-sm">
            <PixelSparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="text-foreground">{mutation.data.mnemonic}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(true)}
          >
            다시 생성
          </Button>
        </div>
      )}
    </Card>
  );
}

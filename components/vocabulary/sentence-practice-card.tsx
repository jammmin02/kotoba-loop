"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { SentenceFeedbackResponse } from "@/app/api/vocabularies/[id]/sentence/feedback/route";
import type { SentenceSubmitResponse } from "@/app/api/vocabularies/[id]/sentence/route";
import { PixelPlus, PixelSparkles, PixelSpinner } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { notifyGameProfileGain } from "@/lib/game/notify";
import type { ExampleSentenceRecord } from "@/types/vocabulary";

interface SentencePracticeCardProps {
  vocabularyId: string;
  initialSentence: string | null;
}

/** `WordTagEditor`(components/vocabulary/word-tag-editor.tsx)와 동일하게, 초기값은 부모
 * 서버 컴포넌트가 SSR로 내려준 `initialSentence`를 prop으로 받는다(별도 GET 없음). */
export function SentencePracticeCard({ vocabularyId, initialSentence }: SentencePracticeCardProps) {
  const router = useRouter();
  const [sentence, setSentence] = useState(initialSentence ?? "");
  const [hasSavedSentence, setHasSavedSentence] = useState(initialSentence !== null);
  const queryClient = useQueryClient();
  // "적용하기"로 저장할 때는 첨삭 결과를 그대로 반영하는 것뿐이라 재첨삭이 불필요하다 — 이
  // ref로 다음 저장 성공 시 feedbackMutation을 재호출하지 않고 대신 리셋하도록 표시해둔다.
  const skipNextFeedbackRef = useRef(false);

  const mutation = useMutation({
    mutationFn: (value: string) =>
      apiFetch<SentenceSubmitResponse>(`/api/vocabularies/${vocabularyId}/sentence`, {
        method: "POST",
        body: { sentence: value },
      }),
    onSuccess: (response) => {
      notifyGameProfileGain(queryClient, response.gameProfile);
      setHasSavedSentence(true);
      toast.success("문장을 저장했어요.");
      if (skipNextFeedbackRef.current) {
        skipNextFeedbackRef.current = false;
        feedbackMutation.reset();
      } else {
        // PROMPT 20-A: 저장이 끝난 뒤에만 첨삭을 요청한다 — 첨삭이 실패해도 이미 끝난 저장/EXP
        // 지급에는 영향이 없다.
        feedbackMutation.mutate();
      }
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "문장 저장에 실패했습니다.");
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: () =>
      apiFetch<SentenceFeedbackResponse>(`/api/vocabularies/${vocabularyId}/sentence/feedback`, {
        method: "POST",
      }),
  });

  const addExampleMutation = useMutation({
    mutationFn: () => {
      const result = feedbackMutation.data?.result;
      if (!result) throw new Error("첨삭 결과가 없습니다.");
      return apiFetch<ExampleSentenceRecord>(`/api/vocabularies/${vocabularyId}/examples`, {
        method: "POST",
        body: { japanese: result.corrected, korean: result.correctedKorean, source: "문장 만들기" },
      });
    },
    onSuccess: () => {
      toast.success("예문에 추가했어요.");
      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
      router.refresh();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "예문 추가에 실패했습니다.");
    },
  });

  // 이전에 저장해둔 문장이 있으면 페이지 진입 시에도 첨삭을 보여준다(같은 문장이면 캐시로
  // 즉시 응답한다 — lib/ai/sentence-correction.ts의 캐시 키가 단어+문장 조합이라 다시
  // AI를 호출하지 않는다).
  useEffect(() => {
    if (hasSavedSentence) {
      feedbackMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={sentence}
        onChange={(e) => setSentence(e.target.value)}
        placeholder="이 단어를 사용한 나만의 문장을 만들어보세요."
        rows={2}
        maxLength={200}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-end"
        disabled={mutation.isPending || sentence.trim().length === 0}
        loading={mutation.isPending}
        onClick={() => mutation.mutate(sentence.trim())}
      >
        {hasSavedSentence ? "문장 수정하기" : "문장 저장하기"}
      </Button>

      {hasSavedSentence && (
        <div className="flex flex-col gap-1.5 border-t border-pixel-ink/20 pt-2 text-sm">
          {feedbackMutation.isPending && (
            <p className="flex items-center gap-1.5 text-foreground/60">
              <PixelSpinner className="size-3.5 animate-spin" aria-hidden="true" />
              AI 첨삭을 확인하는 중...
            </p>
          )}
          {feedbackMutation.isError && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-foreground/60">
                {feedbackMutation.error instanceof ApiClientError
                  ? feedbackMutation.error.message
                  : "AI 첨삭을 불러오지 못했습니다."}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => feedbackMutation.mutate()}
              >
                다시 시도
              </Button>
            </div>
          )}
          {feedbackMutation.isSuccess && (
            <div className="flex flex-col gap-1">
              {!feedbackMutation.data.result.isAlreadyNatural && (
                <p className="font-medium text-foreground">
                  첨삭: <span className="font-jp">{feedbackMutation.data.result.corrected}</span>
                </p>
              )}
              <p className="text-foreground/60">{feedbackMutation.data.result.explanation}</p>
              {!feedbackMutation.data.result.isAlreadyNatural && (
                <div className="mt-0.5 flex items-center gap-4">
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => {
                      const corrected = feedbackMutation.data.result.corrected;
                      skipNextFeedbackRef.current = true;
                      setSentence(corrected);
                      mutation.mutate(corrected);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
                  >
                    <PixelSparkles className="size-3" aria-hidden="true" />
                    적용하기
                  </button>
                  <button
                    type="button"
                    disabled={addExampleMutation.isPending}
                    onClick={() => addExampleMutation.mutate()}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
                  >
                    <PixelPlus className="size-3" aria-hidden="true" />
                    예문에 추가하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

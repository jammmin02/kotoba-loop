"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { ReviewResultResponse } from "@/app/api/user-vocabulary/[id]/review-result/route";
import { ResumePrompt } from "@/components/study/resume-prompt";
import { Button, buttonVariants } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SpeakButton } from "@/components/ui/speak-button";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { notifyGameProfileGain } from "@/lib/game/notify";
import type { ReviewGrade } from "@/lib/srs/types";
import { useStudySessionStore, type StudySessionMode } from "@/lib/stores/study-session-store";
import { clearSavedSession, loadSavedSession, saveSession } from "@/lib/study/saved-session";
import type { FlashcardSnapshot, SavedSession } from "@/lib/study/saved-session";
import { cn } from "@/lib/utils";
import type { SessionCard } from "@/types/study";

const GRADE_OPTIONS: { grade: ReviewGrade; label: string }[] = [
  { grade: "UNKNOWN", label: "모르겠음" },
  { grade: "HARD", label: "헷갈림" },
  { grade: "GOOD", label: "기억남" },
  { grade: "EASY", label: "쉬움" },
];

export interface FlashcardSessionProps {
  mode: StudySessionMode;
  queue: SessionCard[];
  tagName?: string;
  /**
   * "오늘의 학습" 흐름을 새 단어(플래시카드) → 복습/오답(퀴즈, PROMPT 20)으로 이어가기 위한
   * 훅. `mode==="today"`이고 이 콜백이 주어지면 완료 화면이 "오늘의 학습으로 돌아가기" 링크
   * 대신 다음 단계로 넘어가는 버튼을 보여준다. 태그 모드나 콜백이 없을 때는 기존 동작 그대로.
   */
  onComplete?: () => void;
  /**
   * 완료 화면의 "돌아가기" 링크 대신 호출되는 콜백. 커스텀 학습처럼 같은 URL 안에서 상태로
   * 화면을 전환하는 경우, 같은 경로로의 Link 이동은 상태를 초기화하지 못하므로 필요하다.
   */
  onExit?: () => void;
  /**
   * 진행 상황을 브라우저에 저장하는 슬롯 이름. 지정하면 풀 때마다 자동 저장하고(끝나면 삭제),
   * `resume`에 따라 다음 진입 때 저장본을 되살린다. 생략하면 저장하지 않는다.
   */
  resumeKey?: string;
  /**
   * 저장본이 있을 때의 동작 — "prompt"(기본): 이어서/새로 시작을 묻는다, "auto": 묻지 않고 바로
   * 이어간다, "none": 저장본을 버리고 새로 시작한다(방금 사용자가 직접 새로 시작을 고른 경우).
   */
  resume?: "prompt" | "auto" | "none";
  /** 이어하기 카드에 보여줄 한 줄 설명. */
  resumeLabel?: string;
  /** 이어하기에 필요한 화면 설정(저장본에 함께 보관되어 호출한 화면이 되살린다). */
  resumeMeta?: unknown;
  /** 진행 중 "나가기"가 이동할 경로. onExit이 없을 때만 쓰이며 기본값은 모드별 홈이다. */
  exitHref?: string;
}

function defaultExitHref(mode: StudySessionMode): string {
  return mode === "tag" ? "/words" : mode === "custom" ? "/study/custom" : "/";
}

export function FlashcardSession({
  mode,
  queue,
  tagName,
  onComplete,
  onExit,
  resumeKey,
  resume = "prompt",
  resumeLabel,
  resumeMeta,
  exitHref,
}: FlashcardSessionProps) {
  const queryClient = useQueryClient();
  const {
    queue: storeQueue,
    currentIndex,
    isFlipped,
    isSubmitting,
    tally,
    missedVocabularyIds,
    startSession,
    restoreSession,
    flip,
    setSubmitting,
    recordGrade,
  } = useStudySessionStore();

  // deciding: 저장본 확인 전(브라우저 저장소는 마운트 뒤에야 읽을 수 있다), prompt: 이어서/새로
  // 시작을 묻는 중, running: 세션 진행.
  const [phase, setPhase] = useState<"deciding" | "prompt" | "running">("deciding");
  const [promptSaved, setPromptSaved] = useState<SavedSession<FlashcardSnapshot> | null>(null);

  function startFresh() {
    if (resumeKey) clearSavedSession(resumeKey);
    startSession(mode, queue, tagName);
    setPhase("running");
  }

  // 마운트 시 1회만 큐를 초기화한다(부모가 매 렌더마다 새 배열을 넘겨도 재실행되지 않도록
  // deps를 비워둔다). useLayoutEffect라 커밋 직후·페인트 전에 store가 갱신되어,
  // 이전 세션의 잔여 상태가 화면에 잠깐이라도 비치지 않는다.
  // 브라우저 저장소(외부 시스템)는 마운트 뒤에야 읽을 수 있어, 읽은 결과로 화면 단계를 정한다.
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    const saved = resumeKey && resume !== "none" ? loadSavedSession(resumeKey, "flashcard") : null;
    if (saved && resume === "auto") {
      restoreSession(saved.snapshot);
      setPhase("running");
    } else if (saved) {
      setPromptSaved(saved);
      setPhase("prompt");
    } else {
      startFresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 진행할 때마다 저장하고, 끝나면 지운다. 첫 카드를 채점하기 전(index 0)에는 저장하지 않는다.
  useEffect(() => {
    if (phase !== "running" || !resumeKey) return;
    return useStudySessionStore.subscribe((state) => {
      if (!state.mode) return;
      if (state.currentIndex >= state.queue.length) {
        clearSavedSession(resumeKey);
      } else if (state.currentIndex > 0) {
        saveSession(resumeKey, {
          snapshot: {
            kind: "flashcard",
            mode: state.mode,
            tagName: state.tagName,
            queue: state.queue,
            currentIndex: state.currentIndex,
            tally: state.tally,
            missedVocabularyIds: state.missedVocabularyIds,
            requeueCounts: state.requeueCounts,
          },
          label: resumeLabel,
          meta: resumeMeta,
        });
      }
    });
  }, [phase, resumeKey, resumeLabel, resumeMeta]);

  const total = storeQueue.length;
  const currentCard = storeQueue[currentIndex];
  const isComplete = currentIndex >= total;

  // 타임아웃 등으로 요청이 실패로 표시된 뒤 사용자가 같은 카드에 채점 버튼을 다시 눌러도
  // 서버가 같은 시도로 인식하도록, 카드가 바뀌기 전까지는 requestId를 재사용한다(quiz-session의
  // 자동 재시도 큐와 달리 여기는 실패 시 버튼이 바로 다시 활성화되어 수동 재시도가 가능하기
  // 때문 — 새 requestId를 매번 새로 만들면 서버의 idempotency 체크를 우회해 EXP/SRS가
  // 이중으로 반영될 수 있다).
  const pendingRequestIdRef = useRef<{ vocabularyId: string; requestId: string } | null>(null);

  async function handleGrade(grade: ReviewGrade) {
    // 동기적으로 연타되면 이 클로저의 `isSubmitting`이 아직 이전 렌더 값(false)일 수 있으므로,
    // 스토어의 최신 값을 직접 읽어 판단한다(그래야 진짜 연타 방지가 된다).
    if (useStudySessionStore.getState().isSubmitting || !currentCard) return;
    setSubmitting(true);

    if (pendingRequestIdRef.current?.vocabularyId !== currentCard.vocabularyId) {
      pendingRequestIdRef.current = {
        vocabularyId: currentCard.vocabularyId,
        requestId: crypto.randomUUID(),
      };
    }
    const requestId = pendingRequestIdRef.current.requestId;

    try {
      const response = await apiFetch<ReviewResultResponse>(
        `/api/user-vocabulary/${currentCard.vocabularyId}/review-result`,
        { method: "POST", body: { grade, requestId } },
      );
      pendingRequestIdRef.current = null;
      notifyGameProfileGain(queryClient, response.gameProfile);
      recordGrade(grade);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "채점 처리에 실패했습니다.";
      toast.error(message);
      setSubmitting(false);
    }
  }

  function retryMissed() {
    // 이어서 한 세션에서는 부모가 넘긴 `queue`가 비어 있을 수 있어 스토어의 큐에서 고른다
    // (다시 쌓인 카드가 중복될 수 있으니 단어 id로 한 번만 담는다).
    const seen = new Set<string>();
    const missedCards = storeQueue.filter((card) => {
      if (!missedVocabularyIds.includes(card.vocabularyId) || seen.has(card.vocabularyId)) {
        return false;
      }
      seen.add(card.vocabularyId);
      return true;
    });
    startSession(mode, missedCards, tagName);
  }

  if (phase === "deciding") return null;

  if (phase === "prompt" && promptSaved) {
    return (
      <ResumePrompt
        saved={promptSaved}
        onResume={() => {
          restoreSession(promptSaved.snapshot);
          setPhase("running");
        }}
        onDiscard={startFresh}
      />
    );
  }

  if (isComplete) {
    const totalDone = tally.UNKNOWN + tally.HARD + tally.GOOD + tally.EASY;
    return (
      <div
        className={cn(
          cardVariants({ variant: "elevated" }),
          "flex w-full max-w-md flex-col items-center gap-4 p-6 text-center",
        )}
      >
        <p className="text-lg font-bold text-foreground">
          {mode === "tag"
            ? `『${tagName ?? "선택한 태그"}』 학습 완료!`
            : mode === "custom"
              ? "커스텀 학습 완료!"
              : "오늘의 학습 완료!"}
        </p>
        <p className="text-sm font-content text-foreground/60">
          총 {totalDone}개 단어를 학습했어요. (기억남 {tally.GOOD + tally.EASY}개 · 모르겠음/헷갈림{" "}
          {tally.UNKNOWN + tally.HARD}개)
        </p>
        {missedVocabularyIds.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={retryMissed}
          >
            틀린 것만 다시 풀기 ({missedVocabularyIds.length})
          </Button>
        )}
        {mode === "today" && onComplete ? (
          <Button type="button" variant="quest" size="lg" className="w-full" onClick={onComplete}>
            복습 퀴즈로 이어가기
          </Button>
        ) : onExit ? (
          <Button type="button" variant="quest" size="lg" className="w-full" onClick={onExit}>
            {mode === "custom" ? "커스텀 학습으로 돌아가기" : "돌아가기"}
          </Button>
        ) : (
          <Link
            href={mode === "tag" ? "/words" : mode === "custom" ? "/study/custom" : "/"}
            className={cn(buttonVariants({ variant: "quest", size: "lg" }), "w-full")}
          >
            {mode === "tag"
              ? "단어 목록으로 돌아가기"
              : mode === "custom"
                ? "커스텀 학습으로 돌아가기"
                : "오늘의 학습으로 돌아가기"}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      {mode === "tag" && tagName && (
        <p className="text-center text-sm font-bold text-foreground/60">
          『{tagName}』 태그 학습 중
        </p>
      )}

      <div className="flex items-center justify-end">
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="text-xs font-bold text-foreground/60 hover:text-foreground"
          >
            나가기
          </button>
        ) : (
          <Link
            href={exitHref ?? defaultExitHref(mode)}
            className="text-xs font-bold text-foreground/60 hover:text-foreground"
          >
            나가기
          </Link>
        )}
      </div>

      <ProgressBar value={currentIndex} max={total} label={`${currentIndex}/${total}`} />

      <div style={{ perspective: "1000px" }} className="h-80 w-full">
        <div
          className="relative h-full w-full transition-transform duration-500 ease-out"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <div
            className={cn(
              cardVariants({ variant: "elevated" }),
              "absolute inset-0 flex flex-col items-center justify-center gap-4 p-4",
            )}
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="flex items-center gap-2">
              <p className="font-jp text-4xl font-bold text-foreground">{currentCard?.word}</p>
              {currentCard && (
                <SpeakButton text={currentCard.reading || currentCard.word} size="md" />
              )}
            </div>
            <Button type="button" variant="outline" onClick={flip}>
              뜻 보기
            </Button>
          </div>

          <div
            className={cn(
              cardVariants({ variant: "elevated" }),
              "absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto p-4 text-center",
            )}
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div>
              <p className="font-jp text-2xl font-bold text-foreground">{currentCard?.word}</p>
              <p className="font-jp text-base text-foreground/60">{currentCard?.reading}</p>
            </div>
            <ul className="flex flex-col gap-1">
              {currentCard?.meanings.map((meaning) => (
                <li key={meaning} className="font-content text-foreground">
                  · {meaning}
                </li>
              ))}
            </ul>
            {currentCard && currentCard.examples.length > 0 && (
              <div className="flex flex-col gap-1 border-t-2 border-pixel-ink pt-2">
                <div className="flex items-center justify-center gap-2">
                  <p className="font-jp text-sm text-foreground">
                    {currentCard.examples[0].japanese}
                  </p>
                  <SpeakButton text={currentCard.examples[0].japanese} label="예문 듣기" />
                </div>
                <p className="font-content text-xs text-foreground/60">
                  {currentCard.examples[0].korean}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADE_OPTIONS.map(({ grade, label }) => (
            <Button
              key={grade}
              type="button"
              variant={grade === "UNKNOWN" ? "danger" : grade === "EASY" ? "primary" : "outline"}
              disabled={isSubmitting}
              loading={isSubmitting}
              onClick={() => handleGrade(grade)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

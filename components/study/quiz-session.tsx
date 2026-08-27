"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { PixelCheck, PixelX } from "@/components/icons/pixel-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { notifyGameProfileGain } from "@/lib/game/notify";
import { gradeQuizAnswer } from "@/lib/quiz/grading";
import { QUIZ_TYPE_LABELS } from "@/lib/quiz/types";
import type { QuizQuestion, QuizTargetType, QuizType } from "@/lib/quiz/types";
import { useQuizSessionStore, type QuizFeedback } from "@/lib/stores/quiz-session-store";
import { cn } from "@/lib/utils";
import type { QuizSessionResponse, QuizSubmitResponse } from "@/types/quiz";

import type { RefObject } from "react";

export { QUIZ_TYPE_LABELS };

/** 정답/오답 표시 후 자동으로 다음 문제로 넘어가기까지의 대기 시간. */
const ADVANCE_DELAY_MS = 1100;
/** 네트워크 실패 시 재시도 횟수(최초 시도 포함). */
const SUBMIT_MAX_ATTEMPTS = 3;

interface SubmitPayload {
  question: QuizQuestion;
  userAnswer: string;
  responseTimeMs: number;
  /** 문제당 한 번만 생성해 재시도에도 그대로 재사용하는 idempotency key(PROMPT 37) — 서버가
   * 같은 값을 다시 받으면 이미 처리된 제출로 보고 EXP/SRS를 다시 반영하지 않는다. */
  requestId: string;
}

function getDisplayCorrectAnswer(question: QuizQuestion): string {
  if (question.choices && question.choices.length > 0) {
    return (
      question.choices.find((choice) => choice.id === question.correctAnswer)?.text ??
      question.correctAnswer
    );
  }
  return question.correctAnswer;
}

function textAnswerPlaceholder(quizType: QuizType): string {
  switch (quizType) {
    case "KO_TO_JA":
      return "일본어 단어를 입력하세요";
    case "FURIGANA":
      return "읽는 법(후리가나)을 입력하세요";
    case "KANJI_READING":
      return "읽는 법(음독/훈독)을 입력하세요";
    default:
      return "정답을 입력하세요";
  }
}

/**
 * 네트워크 실패(NETWORK_ERROR/TIMEOUT)에서만 재시도한다 — VALIDATION_ERROR/UNAUTHORIZED 등은
 * 다시 보내도 똑같이 실패하므로 즉시 포기한다. 답안 유실 방지(PROMPT 20 요구사항) 대응.
 */
async function submitAnswerWithRetry(payload: SubmitPayload): Promise<QuizSubmitResponse> {
  for (let attempt = 0; attempt < SUBMIT_MAX_ATTEMPTS; attempt++) {
    try {
      return await apiFetch<QuizSubmitResponse>("/api/quiz/submit", {
        method: "POST",
        body: payload,
      });
    } catch (err) {
      const isRetryable =
        err instanceof ApiClientError && (err.code === "NETWORK_ERROR" || err.code === "TIMEOUT");
      if (!isRetryable || attempt === SUBMIT_MAX_ATTEMPTS - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  // SUBMIT_MAX_ATTEMPTS >= 1이므로 도달하지 않는다(타입 좁히기용).
  throw new Error("unreachable");
}

interface QuizAnswerAreaProps {
  question: QuizQuestion;
  feedback: QuizFeedback | null;
  startedAtRef: RefObject<number>;
  onSubmit: (rawAnswer: string, responseTimeMs: number) => void;
}

/**
 * 별도 컴포넌트로 분리해 문제별 로컬 입력 상태(텍스트/선택한 보기)를 갖는다. 부모가
 * `key={currentIndex}`로 문제마다 새로 마운트하므로, 다음 문제로 넘어갈 때 이 상태가
 * 자연히 초기화된다(리셋용 이펙트가 따로 필요 없다).
 */
function QuizAnswerArea({ question, feedback, startedAtRef, onSubmit }: QuizAnswerAreaProps) {
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

  if (question.choices && question.choices.length > 0) {
    return (
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {question.choices?.map((choice) => {
          const isChosen = selectedChoiceId === choice.id;
          const isTheCorrectChoice = !!feedback && choice.id === question.correctAnswer;
          return (
            <ChipButton
              key={choice.id}
              type="button"
              selected={isChosen}
              disabled={!!feedback}
              onClick={() => {
                setSelectedChoiceId(choice.id);
                onSubmit(choice.id, Date.now() - startedAtRef.current);
              }}
              className={cn(
                isTheCorrectChoice && "border-success bg-success text-success-foreground",
                feedback &&
                  isChosen &&
                  !isTheCorrectChoice &&
                  "border-error bg-error text-error-foreground",
              )}
            >
              {choice.text}
            </ChipButton>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {question.quizType === "SENTENCE_TRANSLATION" ? (
        <Textarea
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          disabled={!!feedback}
          placeholder="한국어로 해석을 입력하세요"
          rows={3}
        />
      ) : (
        <Input
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          disabled={!!feedback}
          placeholder={textAnswerPlaceholder(question.quizType)}
          onKeyDown={(e) => {
            // `isComposing`을 확인하지 않으면 일본어/한국어 IME로 글자를 조합하는 도중
            // 확정 Enter가 그대로 제출로 잡혀, 아직 입력 중인 답을 잘못 채점해버린다.
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              onSubmit(textAnswer.trim(), Date.now() - startedAtRef.current);
            }
          }}
        />
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!!feedback}
          onClick={() => onSubmit("", Date.now() - startedAtRef.current)}
        >
          모르겠어요
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!!feedback}
          onClick={() => onSubmit(textAnswer.trim(), Date.now() - startedAtRef.current)}
        >
          제출
        </Button>
      </div>
    </div>
  );
}

interface ReturnActionProps {
  href: string;
  label: string;
  onExit?: () => void;
  className?: string;
}

/**
 * 오늘의 학습(홈으로 이동)과 오답노트(같은 화면에서 목록으로 되돌아가야 함, PROMPT 21)가
 * 세션 종료 후 서로 다른 방식으로 돌아가야 해서 두 방식을 하나로 감싼다.
 */
function ReturnAction({ href, label, onExit, className }: ReturnActionProps) {
  if (onExit) {
    return (
      <button type="button" onClick={onExit} className={className}>
        {label}
      </button>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export interface QuizSessionProps {
  targetIds: string[];
  /** 퀴즈 대상 종류. 생략 시 단어(기존 호출부 호환). PROMPT 36부터 "kanji"도 지원한다. */
  targetType?: QuizTargetType;
  /** 지정하면 이 유형들로만 문제를 낸다(커스텀 학습에서 게임 종류를 고른 경우). 생략 시 전체 유형. */
  quizTypes?: QuizType[];
  /** 세션 종료 후 돌아갈 경로. onExit이 없을 때만 쓰인다. 기본값은 오늘의 학습 홈("/"). */
  returnHref?: string;
  /** 돌아가기 버튼/링크 라벨. 기본값은 화면별로 다르다("복습할 문제가 없어요" vs 완료 화면). */
  returnLabel?: string;
  /** 지정하면 라우팅 대신 이 콜백으로 종료를 알린다(같은 화면에서 상태만 전환할 때 사용). */
  onExit?: () => void;
}

export function QuizSession({
  targetIds,
  targetType = "vocab",
  quizTypes,
  returnHref = "/",
  returnLabel,
  onExit,
}: QuizSessionProps) {
  const queryClient = useQueryClient();
  const {
    questions,
    currentIndex,
    feedback,
    correctCount,
    wrongCount,
    missedTargetIds,
    startSession,
    recordAnswer,
    advance,
  } = useQuizSessionStore();

  // 최초에는 부모가 넘긴 전체 대상, "틀린 것만 다시 풀기" 클릭 후에는 그 문제들만 담는다.
  const [activeIds, setActiveIds] = useState(targetIds);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 정답률 기반으로 비중을 높인 유형(PROMPT 39) — 있으면 세션 상단에 짧은 안내만 띄운다.
  const [boostedType, setBoostedType] = useState<QuizType | null>(null);
  const questionStartedAtRef = useRef(0);
  // 재시도까지 실패한 제출을 세션 종료 시점에 한 번 더 시도해본다(별도 영속 저장소 없이
  // "최선을 다해 보존"하는 수준 — 탭을 닫아버리면 그 답안의 SRS 갱신은 유실될 수 있다).
  const pendingFailuresRef = useRef<SubmitPayload[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<QuizSessionResponse>("/api/quiz/session", {
      method: "POST",
      body: { targetType, targetIds: activeIds, quizTypes },
    })
      .then((res) => {
        if (!cancelled) {
          startSession(res.questions);
          setBoostedType(res.boostedType);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err instanceof ApiClientError ? err.message : "퀴즈를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingQuestions(false);
      });
    return () => {
      cancelled = true;
    };
    // activeIds는 최초 마운트 시의 targetIds이거나 retryMissed()로만 바뀐다 — 부모가
    // 넘기는 targetIds 자체의 변경에는 반응하지 않는다(FlashcardSession의 마운트 1회
    // 초기화 패턴과 같은 의도. 태그/기간이 바뀌는 경우는 부모가 `key`로 재마운트시킨다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIds]);

  function retryMissed() {
    setIsLoadingQuestions(true);
    setActiveIds(missedTargetIds);
  }

  useEffect(() => {
    questionStartedAtRef.current = Date.now();
  }, [currentIndex]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(advance, ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [feedback, advance]);

  const total = questions.length;
  const current = questions[currentIndex];
  const isComplete = total > 0 && currentIndex >= total;

  useEffect(() => {
    if (!isComplete || pendingFailuresRef.current.length === 0) return;
    const pending = pendingFailuresRef.current;
    pendingFailuresRef.current = [];
    for (const payload of pending) {
      submitAnswerWithRetry(payload)
        .then((response) =>
          notifyGameProfileGain(queryClient, response.gameProfile, {
            quizCorrect: response.isCorrect,
          }),
        )
        .catch(() => {
          toast.error("일부 학습 기록이 끝내 저장되지 못했어요.");
        });
    }
  }, [isComplete, queryClient]);

  function submit(rawAnswer: string, responseTimeMs: number) {
    // 스토어의 최신 값을 직접 읽는다(FlashcardSession과 동일한 이유 — 연타로 인한 중복 채점을
    // 막으려면 이 클로저의 오래된 `feedback` 값이 아니라 진짜 최신 상태를 봐야 한다).
    if (!current || useQuizSessionStore.getState().feedback) return;

    const isCorrect = gradeQuizAnswer(current, rawAnswer);
    recordAnswer(current, isCorrect);

    const payload: SubmitPayload = {
      question: current,
      userAnswer: rawAnswer,
      responseTimeMs,
      requestId: crypto.randomUUID(),
    };
    submitAnswerWithRetry(payload)
      .then((response) =>
        notifyGameProfileGain(queryClient, response.gameProfile, {
          quizCorrect: response.isCorrect,
        }),
      )
      .catch(() => {
        pendingFailuresRef.current.push(payload);
        toast.error("이번 문제의 학습 기록이 저장되지 못했어요. 세션이 끝나면 다시 시도할게요.");
      });
  }

  if (isLoadingQuestions) {
    return <p className="text-sm text-foreground/60">퀴즈를 불러오는 중...</p>;
  }

  if (loadError) {
    return <p className="text-sm text-error">{loadError}</p>;
  }

  if (total === 0) {
    return (
      <div
        className={cn(
          cardVariants({ variant: "elevated" }),
          "flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center",
        )}
      >
        <p className="text-lg font-bold text-foreground">복습할 문제가 없어요</p>
        <ReturnAction
          href={returnHref}
          label={returnLabel ?? "오늘의 학습으로"}
          onExit={onExit}
          className={cn(buttonVariants({ variant: "outline" }))}
        />
      </div>
    );
  }

  if (isComplete) {
    const totalDone = correctCount + wrongCount;
    const accuracy = totalDone === 0 ? 0 : Math.round((correctCount / totalDone) * 100);
    return (
      <div
        className={cn(
          cardVariants({ variant: "elevated" }),
          "flex w-full max-w-md flex-col items-center gap-4 p-6 text-center",
        )}
      >
        <p className="text-lg font-bold text-foreground">복습 퀴즈 완료!</p>
        <p className="text-sm font-content text-foreground/60">
          총 {totalDone}문제 중 {correctCount}개 정답 (정답률 {accuracy}%)
        </p>
        {missedTargetIds.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={retryMissed}
          >
            틀린 것만 다시 풀기 ({missedTargetIds.length})
          </Button>
        )}
        <ReturnAction
          href={returnHref}
          label={returnLabel ?? "오늘의 학습으로 돌아가기"}
          onExit={onExit}
          className={cn(buttonVariants({ variant: "quest", size: "lg" }), "w-full")}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      {boostedType && (
        <p className="text-xs font-bold text-foreground/50">
          오늘은 {QUIZ_TYPE_LABELS[boostedType]} 문제가 더 많이 나와요.
        </p>
      )}
      <ProgressBar value={currentIndex} max={total} label={`${currentIndex}/${total}`} />

      <div
        key={currentIndex}
        className={cn(
          cardVariants({ variant: "elevated" }),
          "flex flex-col items-center gap-4 p-4 text-center",
          feedback?.isCorrect && "animate-quiz-flash border-success",
          feedback && !feedback.isCorrect && "animate-quiz-flash border-error",
        )}
      >
        <span className="text-xs font-bold text-foreground/50">
          {QUIZ_TYPE_LABELS[current.quizType]}
        </span>
        <p className="font-jp text-2xl font-bold whitespace-pre-wrap text-foreground">
          {current.prompt}
        </p>

        <QuizAnswerArea
          question={current}
          feedback={feedback}
          startedAtRef={questionStartedAtRef}
          onSubmit={submit}
        />

        {feedback && (
          <div
            className={cn(
              "flex w-full items-center justify-center gap-2 border-2 border-pixel-ink px-3 py-2 text-sm font-bold",
              feedback.isCorrect
                ? "bg-success text-success-foreground"
                : "bg-error text-error-foreground",
            )}
          >
            {feedback.isCorrect ? (
              <PixelCheck className="size-4" aria-hidden="true" />
            ) : (
              <PixelX className="size-4" aria-hidden="true" />
            )}
            {feedback.isCorrect
              ? "정답이에요!"
              : `오답이에요. 정답: ${getDisplayCorrectAnswer(current)}`}
          </div>
        )}

        {feedback && (
          <Button type="button" variant="outline" size="sm" onClick={advance}>
            다음 문제 →
          </Button>
        )}
      </div>
    </div>
  );
}

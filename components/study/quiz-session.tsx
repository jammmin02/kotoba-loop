"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { PixelCheck, PixelX } from "@/components/icons/pixel-icons";
import { ResumePrompt } from "@/components/study/resume-prompt";
import { Button, buttonVariants } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SpeakButton } from "@/components/ui/speak-button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { notifyGameProfileGain } from "@/lib/game/notify";
import { gradeQuizAnswer } from "@/lib/quiz/grading";
import { QUIZ_TYPE_LABELS } from "@/lib/quiz/types";
import type { QuizQuestion, QuizTargetType, QuizType } from "@/lib/quiz/types";
import { useQuizSessionStore, type QuizFeedback } from "@/lib/stores/quiz-session-store";
import { clearSavedSession, loadSavedSession, saveSession } from "@/lib/study/saved-session";
import type { QuizSnapshot, SavedSession } from "@/lib/study/saved-session";
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

/** 문제 본문이 일본어로 출제되는 유형 — 스크린리더가 일본어 음성으로 읽게 lang을 붙이는 데 쓴다. */
const JAPANESE_PROMPT_TYPES: ReadonlySet<QuizType> = new Set([
  "JA_TO_KO",
  "FURIGANA",
  "SENTENCE_TRANSLATION",
  "KANJI_MEANING",
  "KANJI_READING",
]);

function getFeedbackMessage(question: QuizQuestion, feedback: QuizFeedback): string {
  return feedback.isCorrect
    ? "정답이에요!"
    : `오답이에요. 정답: ${getDisplayCorrectAnswer(question)}`;
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
  /** 지정하면 출제 가능한 대상 중 이 개수만 문제로 낸다(커스텀 학습의 문항 수). 생략 시 전부. */
  count?: number;
  /** 세션 종료 후 돌아갈 경로. onExit이 없을 때만 쓰인다. 기본값은 오늘의 학습 홈("/"). */
  returnHref?: string;
  /** 돌아가기 버튼/링크 라벨. 기본값은 화면별로 다르다("복습할 문제가 없어요" vs 완료 화면). */
  returnLabel?: string;
  /** 지정하면 라우팅 대신 이 콜백으로 종료를 알린다(같은 화면에서 상태만 전환할 때 사용). */
  onExit?: () => void;
  /**
   * 진행 상황을 브라우저에 저장하는 슬롯 이름. 지정하면 문제를 풀 때마다 자동 저장하고(끝나면
   * 삭제), `resume`에 따라 다음 진입 때 저장본을 되살린다. 생략하면 저장하지 않는다.
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
}

export function QuizSession({
  targetIds,
  targetType = "vocab",
  quizTypes,
  count,
  returnHref = "/",
  returnLabel,
  onExit,
  resumeKey,
  resume = "prompt",
  resumeLabel,
  resumeMeta,
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
    restoreSession,
    recordAnswer,
    advance,
  } = useQuizSessionStore();

  // 최초에는 부모가 넘긴 전체 대상, "틀린 것만 다시 풀기" 클릭 후에는 그 문제들만 담는다.
  const [activeIds, setActiveIds] = useState(targetIds);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 정답률 기반으로 비중을 높인 유형(PROMPT 39) — 있으면 세션 상단에 짧은 안내만 띄운다.
  const [boostedType, setBoostedType] = useState<QuizType | null>(null);
  // 요청한 문항 수보다 출제 가능한 단어가 적을 때(예: 예문 없는 단어 제외) 띄우는 안내용.
  const [shortfall, setShortfall] = useState<{ requested: number; available: number } | null>(null);
  const questionStartedAtRef = useRef(0);
  // 재시도까지 실패한 제출을 세션 종료 시점에 한 번 더 시도해본다(별도 영속 저장소 없이
  // "최선을 다해 보존"하는 수준 — 탭을 닫아버리면 그 답안의 SRS 갱신은 유실될 수 있다).
  const pendingFailuresRef = useRef<SubmitPayload[]>([]);

  // deciding: 저장본 확인 전(브라우저 저장소는 마운트 뒤에야 읽을 수 있다), prompt: 이어서/새로
  // 시작을 묻는 중, ready: 문제를 불러왔거나(fetchRequested) 저장본으로 되살린 상태.
  const [phase, setPhase] = useState<"deciding" | "prompt" | "ready">("deciding");
  const [promptSaved, setPromptSaved] = useState<SavedSession<QuizSnapshot> | null>(null);
  // 저장본을 쓰지 않을 때만 서버에서 문제를 만든다.
  const [fetchRequested, setFetchRequested] = useState(false);

  function startFresh() {
    if (resumeKey) clearSavedSession(resumeKey);
    setFetchRequested(true);
    setPhase("ready");
  }

  function resumeFrom(saved: SavedSession<QuizSnapshot>) {
    restoreSession(saved.snapshot);
    setIsLoadingQuestions(false);
    setPhase("ready");
  }

  // 브라우저 저장소(외부 시스템)는 마운트 뒤에야 읽을 수 있어, 읽은 결과로 화면 단계를 정한다.
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    const saved = resumeKey && resume !== "none" ? loadSavedSession(resumeKey, "quiz") : null;
    if (saved && resume === "auto") {
      resumeFrom(saved);
    } else if (saved) {
      setPromptSaved(saved);
      setPhase("prompt");
    } else {
      startFresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 풀 때마다 저장하고, 끝나면 지운다. 정답/오답 표시 중에는 곧 다음 문제로 넘어가므로 다음
  // 번호로 저장한다(그래야 이어할 때 이미 채점한 문제를 다시 내지 않는다).
  useEffect(() => {
    if (phase !== "ready" || !resumeKey) return;
    return useQuizSessionStore.subscribe((state) => {
      if (state.questions.length === 0) return;
      const index = state.feedback ? state.currentIndex + 1 : state.currentIndex;
      if (index >= state.questions.length) {
        clearSavedSession(resumeKey);
      } else if (index > 0) {
        saveSession(resumeKey, {
          snapshot: {
            kind: "quiz",
            questions: state.questions,
            currentIndex: index,
            correctCount: state.correctCount,
            wrongCount: state.wrongCount,
            missedTargetIds: state.missedTargetIds,
            requeueCounts: state.requeueCounts,
          },
          label: resumeLabel,
          meta: resumeMeta,
        });
      }
    });
  }, [phase, resumeKey, resumeLabel, resumeMeta]);

  useEffect(() => {
    if (!fetchRequested) return;
    let cancelled = false;
    // "틀린 것만 다시 풀기"로 대상이 바뀐 뒤에는 문항 수 제한을 적용하지 않는다.
    const effectiveCount = activeIds === targetIds ? count : undefined;
    apiFetch<QuizSessionResponse>("/api/quiz/session", {
      method: "POST",
      body: { targetType, targetIds: activeIds, quizTypes, count: effectiveCount },
    })
      .then((res) => {
        if (!cancelled) {
          startSession(res.questions);
          setBoostedType(res.boostedType);
          setShortfall(
            effectiveCount !== undefined &&
              res.availableCount !== undefined &&
              res.availableCount < effectiveCount
              ? { requested: effectiveCount, available: res.availableCount }
              : null,
          );
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
  }, [activeIds, fetchRequested]);

  function retryMissed() {
    setIsLoadingQuestions(true);
    setFetchRequested(true);
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

  if (phase === "deciding") return null;

  if (phase === "prompt" && promptSaved) {
    return (
      <ResumePrompt
        saved={promptSaved}
        onResume={() => resumeFrom(promptSaved)}
        onDiscard={startFresh}
      />
    );
  }

  if (isLoadingQuestions) {
    return <p className="text-sm text-muted">퀴즈를 불러오는 중...</p>;
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
        <p className="text-sm font-content text-muted">
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
      <div className="flex items-center justify-end">
        <ReturnAction
          href={returnHref}
          label="나가기"
          onExit={onExit}
          className="text-xs font-bold text-muted hover:text-foreground"
        />
      </div>
      {shortfall && (
        <p className="text-xs font-bold text-muted">
          선택한 유형으로 낼 수 있는 단어가 {shortfall.available}개뿐이라 {shortfall.available}
          문제로 진행해요.
        </p>
      )}
      {boostedType && (
        <p className="text-xs font-bold text-muted">
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
        <span className="text-xs font-bold text-muted">{QUIZ_TYPE_LABELS[current.quizType]}</span>
        <div className="flex items-center gap-2">
          <p
            lang={JAPANESE_PROMPT_TYPES.has(current.quizType) ? "ja" : undefined}
            className="font-jp text-2xl font-bold whitespace-pre-wrap text-foreground"
          >
            {current.prompt}
          </p>
          {/* 일본어 단어를 보여주고 한국어 뜻을 묻는 유형만 — 읽기를 묻는 유형에서는 정답이 새어나간다. */}
          {current.quizType === "JA_TO_KO" && (
            <SpeakButton text={current.speechText || current.prompt} size="md" />
          )}
        </div>

        <QuizAnswerArea
          question={current}
          feedback={feedback}
          startedAtRef={questionStartedAtRef}
          onSubmit={submit}
        />

        {/* 정오답 결과를 스크린리더에도 알린다. 라이브 영역은 내용이 바뀌기 전에 이미 있어야 읽히므로
            항상 렌더하고, 화면에 보이는 박스는 같은 문장이 두 번 읽히지 않게 aria-hidden으로 둔다. */}
        <p role="status" aria-live="polite" className="sr-only">
          {feedback ? getFeedbackMessage(current, feedback) : ""}
        </p>

        {feedback && (
          <div
            aria-hidden="true"
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
            {getFeedbackMessage(current, feedback)}
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

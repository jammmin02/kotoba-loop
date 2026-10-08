"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import type { CompositionGradeResponse } from "@/app/api/ai/composition/grade/route";
import type { CompositionPromptResponse } from "@/app/api/ai/composition/prompt/route";
import type { CompositionSessionDetail } from "@/app/api/composition/sessions/[id]/route";
import type {
  CompositionSessionListItem,
  CompositionSessionView,
} from "@/app/api/composition/sessions/route";
import { PixelCheck, PixelSparkles } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { CompositionHint } from "@/lib/ai/composition";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import {
  COMPOSITION_ANSWER_MAX,
  COMPOSITION_CUSTOM_MAX,
  COMPOSITION_CUSTOM_MIN,
  COMPOSITION_DEFAULT_COUNT,
  COMPOSITION_EXCLUDE_MAX,
  COMPOSITION_LEVELS,
  COMPOSITION_SITUATIONS,
  COMPOSITION_TONES,
  COMPOSITION_VOCAB_LEVELS,
  type CompositionModeValue,
} from "@/lib/composition/config";
import { notifyGameProfileGain } from "@/lib/game/notify";
import { cn } from "@/lib/utils";
import type { CompositionAttemptView } from "@/types/composition";

type Phase = "setup" | "writing" | "result" | "summary";

const MODE_OPTIONS: { value: CompositionModeValue; label: string; hint: string }[] = [
  { value: "DEFAULT", label: "기본", hint: `${COMPOSITION_DEFAULT_COUNT}문제` },
  { value: "CUSTOM", label: "직접 정하기", hint: "원하는 문제 수" },
  { value: "ENDLESS", label: "무한", hint: "그만할 때까지" },
];

const KIND_STYLES: Record<string, string> = {
  문법: "bg-error text-error-foreground",
  어휘: "bg-warning text-warning-foreground",
  조사: "bg-warning text-warning-foreground",
  말투: "bg-warning text-warning-foreground",
  표기: "bg-warning text-warning-foreground",
  "실제 표현": "bg-secondary text-secondary-foreground",
};

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

function OptionChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-bold text-muted">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "touch-target border-2 border-pixel-ink px-3 py-1 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              value === option
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-foreground hover:bg-background",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreLine({
  grammar,
  vocab,
  natural,
}: {
  grammar: number;
  vocab: number;
  natural: number;
}) {
  return (
    <p className="text-sm font-content text-muted">
      문법 <b className="text-foreground">{grammar}</b> · 어휘{" "}
      <b className="text-foreground">{vocab}</b> · 자연스러움{" "}
      <b className="text-foreground">{natural}</b>
    </p>
  );
}

function FeedbackCards({ attempt }: { attempt: CompositionAttemptView["feedback"] }) {
  return (
    <div className="flex flex-col gap-3">
      {attempt.items.map((item, i) => (
        <div key={i} className="border-2 border-pixel-ink bg-background p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "border-2 border-pixel-ink px-1.5 py-0.5 text-xs font-bold",
                KIND_STYLES[item.kind],
              )}
            >
              {item.kind}
            </span>
            <span className="font-japanese text-foreground">
              {item.original} <span aria-label="에서">→</span> <b>{item.suggestion}</b>
            </span>
          </div>
          <p className="mt-1 text-sm font-content text-muted">{item.reason}</p>
        </div>
      ))}
      {attempt.modelAnswers.length > 0 && (
        <div className="border-2 border-pixel-ink bg-success/15 p-3">
          <span className="border-2 border-pixel-ink bg-success px-1.5 py-0.5 text-xs font-bold text-success-foreground">
            모범 답안
          </span>
          <ul className="mt-2 flex flex-col gap-1">
            {attempt.modelAnswers.map((answer) => (
              <li key={answer} className="font-japanese text-foreground">
                {answer}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CompositionView() {
  const queryClient = useQueryClient();

  // 설정
  const [situation, setSituation] = useState<(typeof COMPOSITION_SITUATIONS)[number]>("일상");
  const [vocabLevel, setVocabLevel] = useState<(typeof COMPOSITION_VOCAB_LEVELS)[number]>("N4");
  const [compositionLevel, setCompositionLevel] =
    useState<(typeof COMPOSITION_LEVELS)[number]>("단문");
  const [tone, setTone] = useState<(typeof COMPOSITION_TONES)[number]>("정중체");
  const [mode, setMode] = useState<CompositionModeValue>("DEFAULT");
  const [customCount, setCustomCount] = useState("10");

  // 진행
  const [phase, setPhase] = useState<Phase>("setup");
  const [session, setSession] = useState<CompositionSessionView | null>(null);
  const [promptKorean, setPromptKorean] = useState("");
  const [answer, setAnswer] = useState("");
  const [graded, setGraded] = useState<CompositionGradeResponse | null>(null);
  // 지금까지 채점한 문제 수 — 다음 문제를 받으며 graded를 비워도 진행 표시가 유지되도록 따로 둔다.
  const [answered, setAnswered] = useState(0);
  // 출제와 함께 내려온 힌트 — 열어 보면 hintUsed가 되어 EXP가 줄고 기록에 남는다.
  const [hints, setHints] = useState<CompositionHint[]>([]);
  const [hintOpen, setHintOpen] = useState(false);
  const [detail, setDetail] = useState<CompositionSessionDetail | null>(null);
  // 이미 낸 문제(건너뛴 것 포함) — 출제 AI가 겹치지 않게 최근 것만 넘긴다.
  const askedRef = useRef<string[]>([]);

  const historyQuery = useQuery({
    queryKey: ["composition", "sessions"],
    queryFn: () => apiFetch<CompositionSessionListItem[]>("/api/composition/sessions"),
  });

  const promptMutation = useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch<CompositionPromptResponse>("/api/ai/composition/prompt", {
        method: "POST",
        body: { sessionId, exclude: askedRef.current.slice(-COMPOSITION_EXCLUDE_MAX) },
        timeoutMs: 30_000,
      }),
    onSuccess: ({ korean, hints: nextHints }) => {
      askedRef.current.push(korean);
      setPromptKorean(korean);
      setHints(nextHints);
      setHintOpen(false);
      setAnswer("");
      setGraded(null);
      setPhase("writing");
    },
    onError: (err) => toast.error(errorMessage(err, "문제를 만들지 못했어요. 다시 시도해주세요.")),
  });

  const startMutation = useMutation({
    mutationFn: () =>
      apiFetch<CompositionSessionView>("/api/composition/sessions", {
        method: "POST",
        body: {
          situation,
          vocabLevel,
          compositionLevel,
          tone,
          mode,
          customCount: mode === "CUSTOM" ? Number(customCount) : undefined,
        },
      }),
    onSuccess: (created) => {
      askedRef.current = [];
      setAnswered(0);
      setSession(created);
      setDetail(null);
      promptMutation.mutate(created.id);
    },
    onError: (err) => toast.error(errorMessage(err, "작문을 시작하지 못했어요.")),
  });

  const gradeMutation = useMutation({
    mutationFn: (input: {
      sessionId: string;
      promptKorean: string;
      answer: string;
      hintUsed: boolean;
    }) =>
      apiFetch<CompositionGradeResponse>("/api/ai/composition/grade", {
        method: "POST",
        body: input,
        timeoutMs: 45_000,
      }),
    onSuccess: (response) => {
      setGraded(response);
      setAnswered(response.answeredCount);
      setPhase("result");
      if (response.gameProfile) notifyGameProfileGain(queryClient, response.gameProfile);
    },
    onError: (err) => toast.error(errorMessage(err, "채점하지 못했어요. 다시 시도해주세요.")),
  });

  const summaryMutation = useMutation({
    mutationFn: ({ sessionId, finish }: { sessionId: string; finish: boolean }) =>
      apiFetch<CompositionSessionDetail>(`/api/composition/sessions/${sessionId}`, {
        method: finish ? "PATCH" : "GET",
      }),
    onSuccess: (data) => {
      setDetail(data);
      setSession(data.session);
      setPhase("summary");
      queryClient.invalidateQueries({ queryKey: ["composition", "sessions"] });
    },
    onError: (err) => toast.error(errorMessage(err, "결과를 불러오지 못했어요.")),
  });

  function backToSetup() {
    setPhase("setup");
    setSession(null);
    setDetail(null);
    setGraded(null);
    queryClient.invalidateQueries({ queryKey: ["composition", "sessions"] });
  }

  const customInvalid =
    mode === "CUSTOM" &&
    !(
      Number.isInteger(Number(customCount)) &&
      Number(customCount) >= COMPOSITION_CUSTOM_MIN &&
      Number(customCount) <= COMPOSITION_CUSTOM_MAX
    );

  // ---- 설정 ---------------------------------------------------------------
  if (phase === "setup") {
    const starting = startMutation.isPending || promptMutation.isPending;
    return (
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">작문 퀘스트</h1>
          <p className="mt-1 text-sm font-content text-muted">
            한국어 문장을 일본어로 써보면 AI가 채점하고 더 자연스러운 표현까지 알려줘요.
          </p>
        </div>

        <Card title="SAKUBUN.EXE" titleColor="pink" className="flex flex-col gap-4">
          <OptionChips
            label="상황"
            options={COMPOSITION_SITUATIONS}
            value={situation}
            onChange={setSituation}
          />
          <OptionChips
            label="단어 수준"
            options={COMPOSITION_VOCAB_LEVELS}
            value={vocabLevel}
            onChange={setVocabLevel}
          />
          <OptionChips
            label="작문 수준"
            options={COMPOSITION_LEVELS}
            value={compositionLevel}
            onChange={setCompositionLevel}
          />
          <OptionChips label="말투" options={COMPOSITION_TONES} value={tone} onChange={setTone} />

          <div>
            <p className="mb-1.5 text-sm font-bold text-muted">문제 수</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="문제 수">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={mode === option.value}
                  onClick={() => setMode(option.value)}
                  className={cn(
                    "touch-target border-2 border-pixel-ink px-3 py-1 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    mode === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-foreground hover:bg-background",
                  )}
                >
                  <span className="font-bold">{option.label}</span>
                  <span className="ml-1.5 text-xs opacity-80">{option.hint}</span>
                </button>
              ))}
            </div>
            {mode === "CUSTOM" && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={COMPOSITION_CUSTOM_MIN}
                  max={COMPOSITION_CUSTOM_MAX}
                  value={customCount}
                  onChange={(e) => setCustomCount(e.target.value)}
                  aria-label="문제 수"
                  aria-invalid={customInvalid || undefined}
                  className="h-10 w-24 border-2 border-pixel-ink bg-background px-3 text-sm text-foreground shadow-bevel-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                <span className="text-sm font-content text-muted">
                  문제 ({COMPOSITION_CUSTOM_MIN}~{COMPOSITION_CUSTOM_MAX})
                </span>
              </div>
            )}
            {customInvalid && (
              <p role="alert" className="mt-1 text-sm text-error">
                문제 수는 {COMPOSITION_CUSTOM_MIN}~{COMPOSITION_CUSTOM_MAX} 사이로 입력해주세요.
              </p>
            )}
          </div>

          <Button
            variant="quest"
            size="lg"
            loading={starting}
            disabled={customInvalid}
            onClick={() => startMutation.mutate()}
          >
            <PixelSparkles className="size-5" aria-hidden="true" />
            문제 받기
          </Button>
        </Card>

        <section aria-labelledby="composition-history" className="flex flex-col gap-2">
          <h2 id="composition-history" className="text-sm font-bold text-muted">
            최근 작문 기록
          </h2>
          {historyQuery.isLoading && <p className="text-sm text-muted">불러오는 중…</p>}
          {historyQuery.data?.length === 0 && (
            <p className="text-sm font-content text-muted">
              아직 기록이 없어요. 첫 작문을 시작해보세요.
            </p>
          )}
          {historyQuery.data?.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => summaryMutation.mutate({ sessionId: item.id, finish: false })}
              className="flex items-center justify-between gap-3 border-2 border-pixel-ink bg-surface px-3 py-2 text-left hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-foreground">
                  {item.situation} · {item.vocabLevel} · {item.compositionLevel}
                </span>
                <span className="text-xs text-muted">
                  {new Date(item.createdAt).toLocaleDateString("ko-KR")} · {item.answeredCount}문제
                </span>
              </span>
              <span className="shrink-0 text-lg font-bold text-foreground">
                {item.averageScore}
                <span className="text-xs font-normal text-muted">점</span>
              </span>
            </button>
          ))}
        </section>
      </div>
    );
  }

  // ---- 결과 요약 ------------------------------------------------------------
  if (phase === "summary" && detail) {
    const { summary, attempts } = detail;
    return (
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-xl font-bold text-foreground">작문 결과</h1>
        <Card title="SUMMARY" titleColor="mint" className="flex flex-col gap-3">
          {summary.answeredCount === 0 ? (
            <p className="text-sm font-content text-muted">아직 채점한 작문이 없어요.</p>
          ) : (
            <>
              <p className="text-3xl font-bold text-foreground">
                {summary.averageScore}
                <span className="text-base font-normal text-muted"> / 100 평균</span>
              </p>
              <ScoreLine
                grammar={summary.averageGrammar}
                vocab={summary.averageVocabulary}
                natural={summary.averageNaturalness}
              />
              <p className="text-sm font-content text-muted">
                {summary.answeredCount}문제 중 {summary.acceptedCount}문제를 정답으로 인정받았어요.
              </p>
            </>
          )}
        </Card>

        <div className="flex flex-col gap-3">
          {attempts.map((a) => (
            <Card key={a.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-content text-foreground">
                  {a.order}. {a.promptKorean}
                </p>
                <span className="shrink-0 font-bold text-foreground">
                  {a.hintUsed && (
                    <span className="mr-2 border-2 border-pixel-ink bg-warning px-1 py-0.5 text-xs text-warning-foreground">
                      힌트
                    </span>
                  )}
                  {a.score}점
                </span>
              </div>
              <p className="font-japanese text-foreground">{a.answerJapanese}</p>
              <details>
                <summary className="cursor-pointer text-sm font-bold text-primary">
                  피드백 보기
                </summary>
                <div className="mt-2">
                  <FeedbackCards attempt={a.feedback} />
                </div>
              </details>
            </Card>
          ))}
        </div>

        <Button onClick={backToSetup}>새로 시작하기</Button>
      </div>
    );
  }

  // ---- 작성 / 채점 결과 ------------------------------------------------------
  const answeredCount = answered;
  const currentNumber = phase === "result" ? answeredCount : answeredCount + 1;
  const target = session?.targetCount ?? null;
  const progressLabel =
    target === null ? `${currentNumber}번째 문제` : `문제 ${currentNumber} / ${target}`;
  const grading = gradeMutation.isPending;
  const loadingNext = promptMutation.isPending;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-foreground">작문 퀘스트</h1>
        {session && (
          <span className="text-xs text-muted">
            {session.situation} · {session.vocabLevel} · {session.tone}
          </span>
        )}
      </div>

      <Card
        title={progressLabel}
        titleColor={phase === "result" ? "accent" : "mint"}
        className="flex flex-col gap-4"
      >
        <div>
          <p className="mb-1 text-sm font-bold text-muted">다음 문장을 일본어로 쓰세요</p>
          <p className="border-2 border-pixel-ink bg-background px-3 py-2 text-lg font-bold text-foreground">
            {promptKorean}
          </p>
        </div>

        {phase === "writing" && session && (
          <>
            <Textarea
              label="내 작문"
              rows={3}
              lang="ja"
              value={answer}
              maxLength={COMPOSITION_ANSWER_MAX}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="일본어로 입력하세요"
              helperText={`${answer.length}/${COMPOSITION_ANSWER_MAX}`}
              disabled={grading}
            />
            {hints.length > 0 &&
              (hintOpen ? (
                <div className="border-2 border-pixel-ink bg-warning/15 p-3" aria-live="polite">
                  <span className="border-2 border-pixel-ink bg-warning px-1.5 py-0.5 text-xs font-bold text-warning-foreground">
                    힌트
                  </span>
                  <ul className="mt-2 flex flex-col gap-1">
                    {hints.map((hint) => (
                      <li key={hint.word} className="text-sm text-foreground">
                        <span className="font-japanese font-bold">{hint.word}</span>
                        <span className="font-japanese text-muted"> ({hint.reading})</span>
                        <span className="font-content"> — {hint.meaning}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs font-content text-muted">
                    힌트를 봐서 정답 EXP가 줄어들어요.
                  </p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={grading || loadingNext}
                  onClick={() => setHintOpen(true)}
                >
                  힌트 보기 (EXP 감소)
                </Button>
              ))}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={grading}
                loading={loadingNext}
                onClick={() => promptMutation.mutate(session.id)}
              >
                건너뛰기
              </Button>
              <Button
                variant="outline"
                disabled={grading || loadingNext}
                onClick={() =>
                  answeredCount > 0
                    ? summaryMutation.mutate({ sessionId: session.id, finish: true })
                    : backToSetup()
                }
              >
                그만하기
              </Button>
              <Button
                className="flex-1"
                loading={grading}
                disabled={!answer.trim() || loadingNext}
                onClick={() =>
                  gradeMutation.mutate({
                    sessionId: session.id,
                    promptKorean,
                    answer: answer.trim(),
                    hintUsed: hintOpen,
                  })
                }
              >
                {grading ? "채점 중…" : "채점하기"}
              </Button>
            </div>
            {grading && (
              <p role="status" className="text-sm font-content text-muted">
                AI가 작문을 채점하고 있어요. 10초 정도 걸릴 수 있어요.
              </p>
            )}
          </>
        )}

        {phase === "result" && graded && session && (
          <>
            <div>
              <p className="mb-1 text-sm font-bold text-muted">내 작문</p>
              <p className="font-japanese text-lg text-foreground">{answer}</p>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1" aria-live="polite">
              <span className="text-4xl font-bold text-foreground">{graded.result.score}</span>
              <span className="text-sm text-muted">/ 100</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 border-2 border-pixel-ink px-1.5 py-0.5 text-xs font-bold",
                  graded.result.isAccepted
                    ? "bg-success text-success-foreground"
                    : "bg-error text-error-foreground",
                )}
              >
                {graded.result.isAccepted && <PixelCheck className="size-3" aria-hidden="true" />}
                {graded.result.isAccepted ? "정답으로 인정" : "다시 도전해봐요"}
              </span>
            </div>
            <ScoreLine
              grammar={graded.result.grammarScore}
              vocab={graded.result.vocabularyScore}
              natural={graded.result.naturalnessScore}
            />
            {hintOpen && <p className="text-xs font-content text-muted">힌트를 사용했어요.</p>}
            <p className="text-sm font-content text-foreground">{graded.result.comment}</p>

            <FeedbackCards
              attempt={{
                items: graded.result.feedback,
                modelAnswers: graded.result.modelAnswers,
                comment: graded.result.comment,
              }}
            />

            <div className="flex flex-wrap gap-2">
              {!graded.sessionComplete && (
                <Button
                  variant="outline"
                  disabled={loadingNext}
                  onClick={() => summaryMutation.mutate({ sessionId: session.id, finish: true })}
                >
                  그만하기
                </Button>
              )}
              <Button
                className="flex-1"
                loading={loadingNext || summaryMutation.isPending}
                onClick={() =>
                  graded.sessionComplete
                    ? summaryMutation.mutate({ sessionId: session.id, finish: false })
                    : promptMutation.mutate(session.id)
                }
              >
                {graded.sessionComplete ? "결과 보기" : "다음 문제"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

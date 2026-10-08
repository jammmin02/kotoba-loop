"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { ConversationFinishResponse } from "@/app/api/ai/conversation/finish/route";
import type { ConversationStartResponse } from "@/app/api/ai/conversation/start/route";
import type { ConversationTurnResponse } from "@/app/api/ai/conversation/turn/route";
import type { ConversationSessionListItem } from "@/app/api/conversation/sessions/route";
import {
  errorMessage,
  FeedbackCards,
  OptionChips,
  ScoreLine,
} from "@/components/ai/composition-view";
import { PixelCheck, PixelUsers } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { COMPOSITION_VOCAB_LEVELS } from "@/lib/composition/config";
import {
  CONVERSATION_DEFAULT_TURNS,
  CONVERSATION_MESSAGE_MAX,
  CONVERSATION_MIN_TURNS_FOR_EXP,
  CONVERSATION_SCENARIOS,
  CONVERSATION_SCENARIO_DEFS,
  CONVERSATION_TURN_OPTIONS,
  type ConversationScenario,
  type ConversationTone,
} from "@/lib/conversation/config";
import { notifyGameProfileGain } from "@/lib/game/notify";
import { cn } from "@/lib/utils";
import type {
  ConversationGradeView,
  ConversationMessageView,
  ConversationSessionDetail,
  ConversationSessionView,
} from "@/types/conversation";

type Phase = "setup" | "chat" | "summary";

function GradeBadge({ grade }: { grade: ConversationGradeView }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border-2 border-pixel-ink px-1.5 py-0.5 text-xs font-bold",
        grade.isAccepted
          ? "bg-success text-success-foreground"
          : "bg-warning text-warning-foreground",
      )}
    >
      {grade.isAccepted && <PixelCheck className="size-3" aria-hidden="true" />}
      {grade.score}점
    </span>
  );
}

function GradeDetails({ grade }: { grade: ConversationGradeView }) {
  return (
    <details className="mt-1 w-full max-w-[85%] self-end">
      <summary className="flex cursor-pointer items-center justify-end gap-2 text-sm font-bold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <GradeBadge grade={grade} />
        <span>
          피드백 보기
          {grade.feedback.items.length > 0 && ` (${grade.feedback.items.length})`}
        </span>
      </summary>
      <div className="mt-2 flex flex-col gap-2 border-2 border-pixel-ink bg-surface p-3">
        <ScoreLine
          grammar={grade.grammarScore}
          vocab={grade.vocabularyScore}
          natural={grade.naturalnessScore}
        />
        <p className="text-sm font-content text-foreground">{grade.feedback.comment}</p>
        <FeedbackCards attempt={grade.feedback} />
      </div>
    </details>
  );
}

function AiBubble({
  message,
  roleLabel,
  showKo,
  onToggleKo,
}: {
  message: ConversationMessageView;
  roleLabel: string;
  showKo: boolean;
  onToggleKo: () => void;
}) {
  return (
    <div className="flex max-w-[85%] flex-col items-start gap-1 self-start">
      <span className="text-xs font-bold text-muted">{roleLabel}</span>
      <p
        lang="ja"
        className="border-2 border-pixel-ink bg-surface px-3 py-2 font-japanese text-lg text-foreground"
      >
        {message.text}
      </p>
      {message.textKo && (
        <>
          <button
            type="button"
            aria-expanded={showKo}
            onClick={onToggleKo}
            className="text-xs font-bold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {showKo ? "한국어 숨기기" : "한국어 보기"}
          </button>
          {showKo && <p className="text-sm font-content text-muted">{message.textKo}</p>}
        </>
      )}
    </div>
  );
}

function UserBubble({ text, pending }: { text: string; pending?: boolean }) {
  return (
    <div className="flex max-w-[85%] flex-col items-end gap-1 self-end">
      <span className="text-xs font-bold text-muted">나</span>
      <p
        lang="ja"
        className={cn(
          "border-2 border-pixel-ink bg-primary px-3 py-2 font-japanese text-lg text-primary-foreground",
          pending && "opacity-70",
        )}
      >
        {text}
      </p>
    </div>
  );
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-2 self-start text-sm text-muted">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 bg-muted motion-safe:animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
      {label}
    </div>
  );
}

export function ConversationView() {
  const queryClient = useQueryClient();

  // 설정
  const [scenario, setScenario] = useState<ConversationScenario>("점원");
  const [vocabLevel, setVocabLevel] = useState<(typeof COMPOSITION_VOCAB_LEVELS)[number]>("N4");
  const [tone, setTone] = useState<ConversationTone>("정중체");
  const [targetTurns, setTargetTurns] = useState<number>(CONVERSATION_DEFAULT_TURNS);

  // 진행
  const [phase, setPhase] = useState<Phase>("setup");
  const [session, setSession] = useState<ConversationSessionView | null>(null);
  const [messages, setMessages] = useState<ConversationMessageView[]>([]);
  const [answeredTurns, setAnsweredTurns] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [input, setInput] = useState("");
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [koOpen, setKoOpen] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<ConversationSessionDetail | null>(null);
  const [earnedExp, setEarnedExp] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const scenarioDef = CONVERSATION_SCENARIO_DEFS[scenario];

  const historyQuery = useQuery({
    queryKey: ["conversation", "sessions"],
    queryFn: () => apiFetch<ConversationSessionListItem[]>("/api/conversation/sessions"),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pendingText]);

  function changeScenario(next: ConversationScenario) {
    setScenario(next);
    const allowed = CONVERSATION_SCENARIO_DEFS[next].tones;
    if (!allowed.includes(tone)) setTone(allowed[0]);
  }

  const startMutation = useMutation({
    mutationFn: async () => {
      const created = await apiFetch<ConversationSessionView>("/api/conversation/sessions", {
        method: "POST",
        body: { scenario, vocabLevel, tone, targetTurns },
      });
      const opening = await apiFetch<ConversationStartResponse>("/api/ai/conversation/start", {
        method: "POST",
        body: { sessionId: created.id },
        timeoutMs: 30_000,
      });
      return { created, opening };
    },
    onSuccess: ({ created, opening }) => {
      setSession(created);
      setMessages([opening.message]);
      setAnsweredTurns(0);
      setSessionComplete(false);
      setInput("");
      setHintOpen(false);
      setKoOpen(new Set());
      setDetail(null);
      setEarnedExp(null);
      setPhase("chat");
    },
    onError: (err) => toast.error(errorMessage(err, "대화를 시작하지 못했어요.")),
  });

  const turnMutation = useMutation({
    mutationFn: (vars: { sessionId: string; message: string; hintUsed: boolean }) =>
      apiFetch<ConversationTurnResponse>("/api/ai/conversation/turn", {
        method: "POST",
        body: vars,
        timeoutMs: 45_000,
      }),
    onSuccess: (response) => {
      setMessages((prev) => [...prev, response.userMessage, response.aiMessage]);
      setAnsweredTurns(response.answeredTurns);
      setSessionComplete(response.sessionComplete);
      setInput("");
      setHintOpen(false);
      setPendingText(null);
    },
    onError: (err) => {
      // 실패한 턴은 서버에 저장되지 않았으므로 입력을 그대로 두고 다시 보낼 수 있게 한다.
      setPendingText(null);
      toast.error(errorMessage(err, "메시지를 보내지 못했어요. 다시 시도해주세요."));
    },
  });

  const finishMutation = useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch<ConversationFinishResponse>("/api/ai/conversation/finish", {
        method: "POST",
        body: { sessionId },
        timeoutMs: 45_000,
      }),
    onSuccess: (response) => {
      setDetail(response.detail);
      setSession(response.detail.session);
      setEarnedExp(response.gameProfile?.expGained ?? null);
      setPhase("summary");
      if (response.gameProfile) notifyGameProfileGain(queryClient, response.gameProfile);
      queryClient.invalidateQueries({ queryKey: ["conversation", "sessions"] });
    },
    onError: (err) => toast.error(errorMessage(err, "결과를 불러오지 못했어요.")),
  });

  const openMutation = useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch<ConversationSessionDetail>(`/api/conversation/sessions/${sessionId}`),
    onSuccess: (data) => {
      setDetail(data);
      setSession(data.session);
      setEarnedExp(null);
      setPhase("summary");
    },
    onError: (err) => toast.error(errorMessage(err, "기록을 불러오지 못했어요.")),
  });

  function backToSetup() {
    setPhase("setup");
    setSession(null);
    setMessages([]);
    setDetail(null);
    queryClient.invalidateQueries({ queryKey: ["conversation", "sessions"] });
  }

  const sending = turnMutation.isPending;
  const lastMessage = messages[messages.length - 1];
  const latestHints = lastMessage?.role === "AI" ? lastMessage.hints : [];

  function send() {
    const text = input.trim();
    if (!session || !text || sending || sessionComplete) return;
    setPendingText(text);
    turnMutation.mutate({ sessionId: session.id, message: text, hintUsed: hintOpen });
  }

  function toggleKo(id: string) {
    setKoOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---- 설정 ---------------------------------------------------------------
  if (phase === "setup") {
    const starting = startMutation.isPending;
    return (
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">회화 퀘스트</h1>
          <p className="mt-1 text-sm font-content text-muted">
            AI와 일본어로 주고받아 보세요. 말할 때마다 채점하고 더 자연스러운 표현을 알려줘요.
          </p>
        </div>

        <Card title="TALK.EXE" titleColor="mint" className="flex flex-col gap-4">
          <div>
            <OptionChips
              label="상대"
              options={CONVERSATION_SCENARIOS}
              value={scenario}
              onChange={changeScenario}
            />
            <p className="mt-1.5 text-xs font-content text-muted">{scenarioDef.blurb}</p>
          </div>
          <OptionChips
            label="단어 수준"
            options={COMPOSITION_VOCAB_LEVELS}
            value={vocabLevel}
            onChange={setVocabLevel}
          />
          <OptionChips
            label="내 말투"
            options={scenarioDef.tones}
            value={tone}
            onChange={setTone}
          />
          <div>
            <p className="mb-1.5 text-sm font-bold text-muted">대화 턴 수</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="대화 턴 수">
              {CONVERSATION_TURN_OPTIONS.map((turns) => (
                <button
                  key={turns}
                  type="button"
                  aria-pressed={targetTurns === turns}
                  onClick={() => setTargetTurns(turns)}
                  className={cn(
                    "touch-target border-2 border-pixel-ink px-3 py-1 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    targetTurns === turns
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-foreground hover:bg-background",
                  )}
                >
                  {turns}턴
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs font-content text-muted">
              {CONVERSATION_MIN_TURNS_FOR_EXP}턴 이상 말하고 끝내면 EXP를 받을 수 있어요.
            </p>
          </div>

          <Button
            variant="quest"
            size="lg"
            loading={starting}
            onClick={() => startMutation.mutate()}
          >
            <PixelUsers className="size-5" aria-hidden="true" />
            대화 시작
          </Button>
        </Card>

        <section aria-labelledby="conversation-history" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 id="conversation-history" className="text-sm font-bold text-muted">
              최근 회화 기록
            </h2>
            <Link
              href="/stats?tab=conversation"
              className="text-sm font-bold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              통계 보기
            </Link>
          </div>
          {historyQuery.isLoading && <p className="text-sm text-muted">불러오는 중…</p>}
          {historyQuery.data?.length === 0 && (
            <p className="text-sm font-content text-muted">
              아직 기록이 없어요. 첫 대화를 시작해보세요.
            </p>
          )}
          {historyQuery.data?.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openMutation.mutate(item.id)}
              className="flex items-center justify-between gap-3 border-2 border-pixel-ink bg-surface px-3 py-2 text-left hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-foreground">
                  {item.scenario} · {item.topic} · {item.vocabLevel}
                </span>
                <span className="text-xs text-muted">
                  {new Date(item.createdAt).toLocaleDateString("ko-KR")} · {item.answeredCount}턴
                  {!item.finishedAt && " · 진행 중이던 대화"}
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
    const { summary } = detail;
    return (
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-xl font-bold text-foreground">회화 결과</h1>
        <Card title="SUMMARY" titleColor="mint" className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            {detail.session.scenario} · {detail.session.topic} · {detail.session.vocabLevel} ·{" "}
            {detail.session.tone}
          </p>
          {summary.answeredCount === 0 ? (
            <p className="text-sm font-content text-muted">아직 채점한 발화가 없어요.</p>
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
                {summary.answeredCount}번 말해서 {summary.acceptedCount}번이 자연스럽게 통했어요.
              </p>
              {earnedExp !== null && (
                <p className="text-sm font-bold text-success">EXP +{earnedExp} 획득!</p>
              )}
              {detail.session.summaryComment && (
                <div className="border-2 border-pixel-ink bg-background p-3">
                  <p className="text-sm font-content text-foreground">
                    {detail.session.summaryComment}
                  </p>
                  {detail.session.summaryFocus && (
                    <p className="mt-2 text-sm font-content text-muted">
                      <b className="text-foreground">다음 연습:</b> {detail.session.summaryFocus}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </Card>

        <Card title="REPLAY" titleColor="pink" className="flex flex-col gap-3">
          {detail.messages.map((m) =>
            m.role === "AI" ? (
              <div key={m.id} className="flex flex-col gap-0.5">
                <p lang="ja" className="font-japanese text-foreground">
                  <span className="mr-2 text-xs font-bold text-muted">상대</span>
                  {m.text}
                </p>
                {m.textKo && <p className="text-xs font-content text-muted">{m.textKo}</p>}
              </div>
            ) : (
              <div key={m.id} className="flex flex-col gap-1">
                <p lang="ja" className="font-japanese text-foreground">
                  <span className="mr-2 text-xs font-bold text-primary">나</span>
                  {m.text}
                  {m.hintUsed && (
                    <span className="ml-2 border-2 border-pixel-ink bg-warning px-1 py-0.5 text-xs text-warning-foreground">
                      힌트
                    </span>
                  )}
                </p>
                {m.grade && <GradeDetails grade={m.grade} />}
              </div>
            ),
          )}
        </Card>

        <Button onClick={backToSetup}>새로 시작하기</Button>
      </div>
    );
  }

  // ---- 대화 -----------------------------------------------------------------
  const roleLabel = session
    ? (CONVERSATION_SCENARIO_DEFS[session.scenario as ConversationScenario]?.aiLabel ?? "상대")
    : "상대";
  const currentTurn = Math.min(answeredTurns + 1, session?.targetTurns ?? 1);
  const progressLabel = `턴 ${sessionComplete ? answeredTurns : currentTurn} / ${session?.targetTurns ?? 0}`;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-foreground">회화 퀘스트</h1>
        {session && (
          <span className="text-xs text-muted">
            {session.scenario} · {session.topic} · {session.vocabLevel}
          </span>
        )}
      </div>

      <Card title={progressLabel} titleColor="pink" className="flex flex-col gap-3">
        <div
          role="log"
          aria-live="polite"
          aria-label="대화 내용"
          className="flex max-h-[55vh] min-h-64 flex-col gap-3 overflow-y-auto p-1"
        >
          {messages.map((m) =>
            m.role === "AI" ? (
              <AiBubble
                key={m.id}
                message={m}
                roleLabel={roleLabel}
                showKo={koOpen.has(m.id)}
                onToggleKo={() => toggleKo(m.id)}
              />
            ) : (
              <div key={m.id} className="flex flex-col items-end">
                <UserBubble text={m.text} />
                {m.grade && <GradeDetails grade={m.grade} />}
              </div>
            ),
          )}
          {pendingText && <UserBubble text={pendingText} pending />}
          {sending && <TypingIndicator label="상대가 답하는 중… (채점도 함께 해요)" />}
          <div ref={endRef} />
        </div>

        {sessionComplete ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-content text-muted">
              대화가 끝났어요. 결과에서 총평과 복습을 확인해보세요.
            </p>
            <Button
              loading={finishMutation.isPending}
              onClick={() => session && finishMutation.mutate(session.id)}
            >
              결과 보기
            </Button>
          </div>
        ) : (
          <>
            {latestHints.length > 0 &&
              (hintOpen ? (
                <div className="border-2 border-pixel-ink bg-warning/15 p-3" aria-live="polite">
                  <span className="border-2 border-pixel-ink bg-warning px-1.5 py-0.5 text-xs font-bold text-warning-foreground">
                    힌트
                  </span>
                  <ul className="mt-2 flex flex-col gap-1">
                    {latestHints.map((hint) => (
                      <li key={hint.word} className="text-sm text-foreground">
                        <span className="font-japanese font-bold">{hint.word}</span>
                        <span className="font-japanese text-muted"> ({hint.reading})</span>
                        <span className="font-content"> — {hint.meaning}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs font-content text-muted">
                    힌트를 봐서 EXP가 줄어들 수 있어요.
                  </p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={sending}
                  onClick={() => setHintOpen(true)}
                >
                  힌트 보기 (EXP 감소)
                </Button>
              ))}
            <Textarea
              label="내 답변"
              rows={2}
              lang="ja"
              value={input}
              maxLength={CONVERSATION_MESSAGE_MAX}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // 한글·일본어 IME 조합 중의 Enter는 확정 키라 전송하지 않는다.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="일본어로 입력하세요 (Enter 전송 · Shift+Enter 줄바꿈)"
              helperText={`${input.length}/${CONVERSATION_MESSAGE_MAX} · 개인정보는 쓰지 마세요`}
              disabled={sending}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={sending || finishMutation.isPending}
                onClick={() =>
                  answeredTurns > 0 && session ? finishMutation.mutate(session.id) : backToSetup()
                }
              >
                그만하기
              </Button>
              <Button className="flex-1" loading={sending} disabled={!input.trim()} onClick={send}>
                {sending ? "보내는 중…" : "보내기"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

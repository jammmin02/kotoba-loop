"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { ProgressRing } from "@/components/game/progress-ring";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { BattleAnswerResult, BattleParticipantSummary, BattlePublicRound } from "@/types/battle";

interface BattleRoundViewProps {
  roomCode: string;
  round: BattlePublicRound;
  participants: BattleParticipantSummary[];
}

/**
 * 라운드 화면. 제한시간은 서버가 보낸 `round.startedAt` 기준으로 클라이언트가 로컬 계산만 하고,
 * 0에 도달하면 `.../timeout`을 호출해 서버 판정을 트리거한다(서버 시계가 유일한 권위 —
 * 여기 타이머는 UI 표시와 신호 발송용일 뿐, 정답/승자 판정에는 관여하지 않는다).
 *
 * 라운드가 바뀔 때마다 선택/피드백/타이머 상태를 초기화해야 하는데, 이펙트 안에서 직접
 * setState로 리셋하는 대신 호출부(`BattleRoomView`)가 `key={round.roundNumber}`로 이 컴포넌트를
 * 매 라운드 새로 마운트한다 — 그러면 아래 `useState` 초기값 자체가 항상 그 라운드의 첫 렌더고,
 * 리셋용 setState 호출이 따로 필요 없다.
 */
export function BattleRoundView({ roomCode, round, participants }: BattleRoundViewProps) {
  const [remainingMs, setRemainingMs] = useState(round.durationMs);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<BattleAnswerResult | null>(null);
  const timeoutFiredRef = useRef(false);

  const answerMutation = useMutation({
    mutationFn: (choiceId: string) =>
      apiFetch<BattleAnswerResult>(
        `/api/battle-rooms/${roomCode}/rounds/${round.roundNumber}/answer`,
        { method: "POST", body: { choiceId } },
      ),
    onSuccess: setFeedback,
  });

  const timeoutMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/battle-rooms/${roomCode}/rounds/${round.roundNumber}/timeout`, { method: "POST" }),
  });

  useEffect(() => {
    const startedAtMs = new Date(round.startedAt).getTime();
    const interval = setInterval(() => {
      const remaining = Math.max(0, round.durationMs - (Date.now() - startedAtMs));
      setRemainingMs(remaining);
      if (remaining === 0 && !timeoutFiredRef.current) {
        timeoutFiredRef.current = true;
        timeoutMutation.mutate();
      }
    }, 200);
    return () => clearInterval(interval);
    // timeoutMutation은 매 렌더 새 객체라 의존성에 넣으면 인터벌이 불필요하게 재시작된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.durationMs, round.startedAt]);

  const revealed = Boolean(round.endedAt);

  function handleSelect(choiceId: string) {
    if (selectedChoiceId || revealed) return;
    setSelectedChoiceId(choiceId);
    answerMutation.mutate(choiceId);
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground/70">
          {round.roundNumber} / {round.totalRounds} 라운드
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold text-foreground">
            {Math.ceil(remainingMs / 1000)}초
          </span>
          <ProgressRing value={remainingMs} max={round.durationMs} size={48} strokeWidth={5} />
        </div>
      </div>

      <Card variant="elevated" className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-2xl font-extrabold text-foreground">{round.prompt}</p>
      </Card>

      <div className="grid grid-cols-1 gap-2">
        {round.choices.map((choice) => {
          const isSelected = selectedChoiceId === choice.id;
          const isCorrectChoice = revealed && round.correctChoiceId === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              disabled={Boolean(selectedChoiceId) || revealed}
              onClick={() => handleSelect(choice.id)}
              className={cn(
                "border-2 border-pixel-ink px-4 py-3 text-left text-sm font-bold shadow-bevel-raised transition disabled:opacity-100",
                isCorrectChoice
                  ? "bg-success text-success-foreground"
                  : isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-foreground",
              )}
            >
              {choice.text}
            </button>
          );
        })}
      </div>

      {feedback && !revealed && (
        <p
          className={cn(
            "text-center text-sm font-bold",
            feedback.isCorrect ? "text-success" : "text-error",
          )}
        >
          {feedback.isWinner
            ? "정답! 가장 먼저 맞혔어요"
            : feedback.isCorrect
              ? "정답이지만 다른 사람이 먼저 맞혔어요"
              : "오답이에요"}
        </p>
      )}

      <Card variant="elevated" title="실시간 순위" className="flex flex-col gap-1">
        {participants.map((participant, index) => (
          <div key={participant.userId} className="flex items-center justify-between text-sm">
            <span className="font-bold text-foreground">
              {index + 1}. {participant.nickname}
            </span>
            <span className="font-mono text-foreground/70">{participant.score}점</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

import "server-only";

import { BATTLE_ROUND_DURATION_MS } from "@/lib/battle/constants";
import { formatKstISOString } from "@/lib/datetime";
import type { BattleRoomStatus } from "@/lib/generated/prisma/client";
import type { QuizQuestion } from "@/lib/quiz/types";
import type { BattleParticipantSummary, BattlePublicRound, BattleRoomState } from "@/types/battle";

/**
 * `BattleRoom.questions`는 Prisma `Json` 컬럼이라 타입 정보가 없다 — 이 모듈이 쓴 값을 이 모듈만
 * 다시 읽으므로 안전하게 캐스팅한다. 다른 곳에서 `room.questions`를 직접 읽지 않는다(정답 유출
 * 방지 — 이 파일의 함수들만 `questions`를 입력으로 받고, 반환값에는 절대 포함하지 않는다).
 */
export function parseBattleQuestions(questions: unknown): QuizQuestion[] {
  return Array.isArray(questions) ? (questions as QuizQuestion[]) : [];
}

export function toParticipantSummary(
  participant: { user_id: string; score: number; user: { nickname: string } },
  hostUserId: string,
): BattleParticipantSummary {
  return {
    userId: participant.user_id,
    nickname: participant.user.nickname,
    score: participant.score,
    isHost: participant.user_id === hostUserId,
  };
}

export function toParticipantSummaries(
  participants: Array<{ user_id: string; score: number; user: { nickname: string } }>,
  hostUserId: string,
): BattleParticipantSummary[] {
  return [...participants]
    .sort((a, b) => b.score - a.score)
    .map((participant) => toParticipantSummary(participant, hostUserId));
}

/**
 * `lib/quiz/generator.ts`의 `generateMultipleChoice`는 정답 보기의 `id`를 항상 리터럴
 * `"correct"`로 만든다(1인 학습 퀴즈는 클라이언트가 정답까지 들고 있다가 스스로 채점하는
 * 신뢰 모델이라 문제되지 않음 — `lib/validations/quiz.ts` 참고). 대결 모드는 정반대로 정답을
 * 라운드 종료 전까지 숨겨야 하므로, 이 id를 그대로 내보내면 `id === "correct"`인 보기를
 * 고르기만 하면 되는 치명적인 유출이 된다. 그래서 원본 id 대신 배열 위치 기반의 불투명한
 * id(`choice-0`, `choice-1`, ...)로 바꿔 내보내고, 정답 판정도 항상 이 함수로만 변환해
 * 비교한다(`app/.../answer/route.ts`도 동일하게 사용) — 원본 id를 클라이언트로 보내는 경로가
 * 하나도 남지 않게 한다.
 */
export function toPublicChoiceId(question: QuizQuestion, originalChoiceId: string): string {
  const index = (question.choices ?? []).findIndex((choice) => choice.id === originalChoiceId);
  return `choice-${index}`;
}

/** `correctChoiceId`/`winnerUserId`는 라운드가 끝났을 때(`ended_at` 존재)만 채워진다. */
export function toPublicRound(
  round: {
    round_number: number;
    started_at: Date;
    ended_at: Date | null;
    winnerParticipant: { user_id: string } | null;
  },
  question: QuizQuestion,
  totalRounds: number,
): BattlePublicRound {
  return {
    roundNumber: round.round_number,
    totalRounds,
    prompt: question.prompt,
    choices: (question.choices ?? []).map((choice) => ({
      id: toPublicChoiceId(question, choice.id),
      text: choice.text,
    })),
    startedAt: formatKstISOString(round.started_at),
    durationMs: BATTLE_ROUND_DURATION_MS,
    endedAt: round.ended_at ? formatKstISOString(round.ended_at) : null,
    correctChoiceId: round.ended_at ? toPublicChoiceId(question, question.correctAnswer) : null,
    winnerUserId: round.winnerParticipant?.user_id ?? null,
  };
}

export function toBattleRoomState(params: {
  room: {
    room_code: string;
    host_user_id: string;
    status: BattleRoomStatus;
    round_count: number;
  };
  bookName: string;
  participants: Array<{ user_id: string; score: number; user: { nickname: string } }>;
  currentRound: BattlePublicRound | null;
}): BattleRoomState {
  return {
    roomCode: params.room.room_code,
    hostUserId: params.room.host_user_id,
    bookName: params.bookName,
    status: params.room.status,
    roundCount: params.room.round_count,
    participants: toParticipantSummaries(params.participants, params.room.host_user_id),
    currentRound: params.currentRound,
  };
}

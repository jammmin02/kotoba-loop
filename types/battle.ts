import type { BattleRoomStatus } from "@/lib/generated/prisma/client";

export interface BattleParticipantSummary {
  userId: string;
  nickname: string;
  score: number;
  isHost: boolean;
}

export interface BattlePublicChoice {
  id: string;
  text: string;
}

/** 진행 중/종료된 라운드의 클라이언트 공개 정보 — `correctAnswer`는 라운드 종료 전엔 절대 포함하지 않는다. */
export interface BattlePublicRound {
  roundNumber: number;
  totalRounds: number;
  prompt: string;
  choices: BattlePublicChoice[];
  startedAt: string;
  durationMs: number;
  endedAt: string | null;
  correctChoiceId: string | null;
  winnerUserId: string | null;
}

export interface BattleRoomState {
  roomCode: string;
  hostUserId: string;
  bookName: string;
  status: BattleRoomStatus;
  roundCount: number;
  participants: BattleParticipantSummary[];
  currentRound: BattlePublicRound | null;
}

export interface BattleAnswerResult {
  isCorrect: boolean;
  isWinner: boolean;
}

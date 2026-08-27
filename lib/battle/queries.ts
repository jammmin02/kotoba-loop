import "server-only";

import { advanceRoundIfEnded } from "@/lib/battle/round-lifecycle";
import { parseBattleQuestions, toBattleRoomState, toPublicRound } from "@/lib/battle/serialize";
import { db } from "@/lib/db";
import type { BattlePublicRound, BattleRoomState } from "@/types/battle";

/**
 * 방의 현재 상태를 읽는 유일한 진입점. 진행 중인 방이면 먼저 `advanceRoundIfEnded`로 "라운드는
 * 끝났는데 다음 라운드가 아직 없는" 상태를 스스로 복구한 뒤 최신 상태를 읽는다 — 생성/참가/시작/
 * 답변/타임아웃/조회 API가 모두 이 함수 하나로 응답을 만든다.
 */
export async function loadBattleRoomState(roomId: string): Promise<BattleRoomState> {
  let room = await db.battleRoom.findUniqueOrThrow({ where: { id: roomId } });

  if (room.status === "playing") {
    const latestRound = await db.battleRound.findFirst({
      where: { room_id: room.id },
      orderBy: { round_number: "desc" },
    });
    if (latestRound) {
      await advanceRoundIfEnded(latestRound.id);
      room = await db.battleRoom.findUniqueOrThrow({ where: { id: room.id } });
    }
  }

  const [book, participants, currentRoundRow] = await Promise.all([
    db.vocabularyBook.findUniqueOrThrow({
      where: { id: room.vocabulary_book_id },
      select: { name: true },
    }),
    db.battleParticipant.findMany({ where: { room_id: room.id }, include: { user: true } }),
    db.battleRound.findFirst({
      where: { room_id: room.id },
      orderBy: { round_number: "desc" },
      include: { winnerParticipant: { select: { user_id: true } } },
    }),
  ]);

  let currentRound: BattlePublicRound | null = null;
  if (currentRoundRow) {
    const questions = parseBattleQuestions(room.questions);
    const question = questions[currentRoundRow.round_number - 1];
    if (question) {
      currentRound = toPublicRound(currentRoundRow, question, room.round_count);
    }
  }

  return toBattleRoomState({ room, bookName: book.name, participants, currentRound });
}

/** 방 코드로 방을 찾는다(대소문자 구분 없이 입력받되 저장은 항상 대문자다). 없으면 `null`. */
export async function findBattleRoomByCode(roomCode: string) {
  return db.battleRoom.findUnique({ where: { room_code: roomCode.toUpperCase() } });
}

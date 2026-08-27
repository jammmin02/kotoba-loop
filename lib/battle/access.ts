import "server-only";

import { ApiError } from "@/lib/api/error";
import { findBattleRoomByCode } from "@/lib/battle/queries";
import { db } from "@/lib/db";

/** 존재하지 않는 room_code는 404 — 참가자 확인과 별개로 항상 이 체크부터 한다. */
export async function requireBattleRoom(roomCode: string) {
  const room = await findBattleRoomByCode(roomCode);
  if (!room) {
    throw new ApiError("NOT_FOUND", "방을 찾을 수 없습니다.");
  }
  return room;
}

/** 참가자가 아니면 방이 존재하지 않는 것과 동일하게 404 처리한다(다른 소유권 체크와 동일한
 * 프로빙 방지 원칙 — `lib/vocabulary-ownership.ts` 참고). */
export async function requireBattleParticipant(roomId: string, userId: string) {
  const participant = await db.battleParticipant.findUnique({
    where: { room_id_user_id: { room_id: roomId, user_id: userId } },
  });
  if (!participant) {
    throw new ApiError("NOT_FOUND", "방을 찾을 수 없습니다.");
  }
  return participant;
}

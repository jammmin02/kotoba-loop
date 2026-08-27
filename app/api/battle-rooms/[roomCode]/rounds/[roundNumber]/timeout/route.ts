import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { requireBattleParticipant, requireBattleRoom } from "@/lib/battle/access";
import { advanceRoundIfEnded } from "@/lib/battle/round-lifecycle";
import { db } from "@/lib/db";

import type { NextRequest } from "next/server";

/**
 * 라운드 제한시간 만료 신호. 각 클라이언트가 `round-started`로 받은 `startedAt` 기준 로컬
 * 타이머가 다 되면 호출한다 — 서버 경과시간 재검증은 하지 않는다(호출자 시계가 살짝 빨라도
 * 라운드를 조금 일찍 끝내는 것 이상의 악용 경로가 없다고 판단). 연결이 살아있는 참가자 중
 * 아무나 한 명만 호출해도 전체 라운드가 진행되므로, 한 명이 끊겨도 나머지 진행에 영향이 없다.
 */
export const POST = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/battle-rooms/[roomCode]/rounds/[roundNumber]/timeout">,
  ): Promise<{ ok: true }> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { roomCode, roundNumber: roundNumberParam } = await ctx.params;
    const roundNumber = Number(roundNumberParam);
    if (!Number.isInteger(roundNumber)) {
      throw new ApiError("NOT_FOUND", "라운드를 찾을 수 없습니다.");
    }

    const room = await requireBattleRoom(roomCode);
    await requireBattleParticipant(room.id, session.user.id);

    const round = await db.battleRound.findUnique({
      where: { room_id_round_number: { room_id: room.id, round_number: roundNumber } },
    });
    if (!round) {
      throw new ApiError("NOT_FOUND", "라운드를 찾을 수 없습니다.");
    }

    await advanceRoundIfEnded(round.id);

    return { ok: true };
  },
);

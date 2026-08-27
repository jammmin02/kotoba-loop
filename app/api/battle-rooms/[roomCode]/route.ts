import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { requireBattleParticipant, requireBattleRoom } from "@/lib/battle/access";
import { loadBattleRoomState } from "@/lib/battle/queries";
import type { BattleRoomState } from "@/types/battle";

import type { NextRequest } from "next/server";

/**
 * 방 상태 조회 — 대기실/재연결/최종 결과 화면이 모두 이 하나의 엔드포인트로 상태를 얻는다.
 * `loadBattleRoomState`가 조회 시점에 "라운드는 끝났는데 다음 라운드가 없는" 상태를 스스로
 * 복구하므로, Pusher 재연결 시 이 GET을 다시 호출하는 것만으로 놓친 진행이 따라잡힌다.
 */
export const GET = withApiHandler(
  async (_req: NextRequest, ctx: RouteContext<"/api/battle-rooms/[roomCode]">): Promise<BattleRoomState> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { roomCode } = await ctx.params;
    const room = await requireBattleRoom(roomCode);
    await requireBattleParticipant(room.id, session.user.id);

    return loadBattleRoomState(room.id);
  },
);

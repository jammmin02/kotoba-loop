import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { requireBattleRoom } from "@/lib/battle/access";
import { loadBattleRoomState } from "@/lib/battle/queries";
import { db } from "@/lib/db";
import type { BattleRoomState } from "@/types/battle";

import type { NextRequest } from "next/server";

/**
 * 방 참가(PROMPT 54) — 로그인 사용자만 가능하다(비로그인 접속은 페이지 레벨에서 로그인으로
 * 리다이렉트, `app/study/battle/[roomCode]/page.tsx`). 대기 중인 방만 참가할 수 있고, 이미
 * 참가한 사용자가 다시 호출해도(새로고침/재접속) upsert라 안전하게 멱등하다.
 */
export const POST = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/battle-rooms/[roomCode]/join">,
  ): Promise<BattleRoomState> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { roomCode } = await ctx.params;
    const room = await requireBattleRoom(roomCode);
    if (room.status !== "waiting") {
      throw new ApiError("CONFLICT", "이미 시작된 방이에요.");
    }

    await db.battleParticipant.upsert({
      where: { room_id_user_id: { room_id: room.id, user_id: session.user.id } },
      create: { room_id: room.id, user_id: session.user.id },
      update: {},
    });

    return loadBattleRoomState(room.id);
  },
);

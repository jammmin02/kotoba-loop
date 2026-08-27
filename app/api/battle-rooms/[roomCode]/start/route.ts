import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { requireBattleRoom } from "@/lib/battle/access";
import { triggerBattleEvent } from "@/lib/battle/broadcast";
import { battleChannelName } from "@/lib/battle/channel";
import { BATTLE_MIN_PARTICIPANTS } from "@/lib/battle/constants";
import { loadBattleRoomState } from "@/lib/battle/queries";
import { generateBattleQuestions } from "@/lib/battle/question-set";
import { toPublicRound } from "@/lib/battle/serialize";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { BattleRoomState } from "@/types/battle";

import type { NextRequest } from "next/server";

/**
 * 대결 시작(호스트 전용, PROMPT 54). 문제 세트를 한 번 생성해 방에 스냅샷으로 저장하고(라운드마다
 * 재생성하지 않음 — `lib/battle/question-set.ts` 참고), 실제 생성된 문제 수를 방의 round_count로
 * 확정한 뒤 1라운드를 시작한다.
 */
export const POST = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/battle-rooms/[roomCode]/start">,
  ): Promise<BattleRoomState> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { roomCode } = await ctx.params;
    const room = await requireBattleRoom(roomCode);
    if (room.host_user_id !== session.user.id) {
      throw new ApiError("FORBIDDEN", "방장만 대결을 시작할 수 있어요.");
    }
    if (room.status !== "waiting") {
      throw new ApiError("CONFLICT", "이미 시작된 방이에요.");
    }

    const participantCount = await db.battleParticipant.count({ where: { room_id: room.id } });
    if (participantCount < BATTLE_MIN_PARTICIPANTS) {
      throw new ApiError("CONFLICT", "참가자가 2명 이상 모여야 시작할 수 있어요.");
    }

    const questions = await generateBattleQuestions(room.vocabulary_book_id);

    const round = await db.$transaction(async (tx) => {
      await tx.battleRoom.update({
        where: { id: room.id },
        data: {
          status: "playing",
          round_count: questions.length,
          questions: questions as unknown as Prisma.InputJsonValue,
        },
      });
      return tx.battleRound.create({
        data: { room_id: room.id, round_number: 1, vocabulary_id: questions[0].targetId },
        include: { winnerParticipant: { select: { user_id: true } } },
      });
    });

    await triggerBattleEvent(
      battleChannelName(room.room_code),
      "round-started",
      toPublicRound(round, questions[0], questions.length),
    );

    return loadBattleRoomState(room.id);
  },
);

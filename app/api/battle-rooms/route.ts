import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { loadBattleRoomState } from "@/lib/battle/queries";
import { generateRoomCode } from "@/lib/battle/room-code";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { createBattleRoomSchema } from "@/lib/validations/battle";
import type { BattleRoomState } from "@/types/battle";

import type { NextRequest } from "next/server";

const ROOM_CODE_MAX_ATTEMPTS = 5;

/**
 * 방 생성(PROMPT 54). 6자리 room_code 충돌은 사전 조회 없이 insert 자체로 검증한다 — 유니크 위반
 * (P2002)이면 새 코드로 재시도한다(`lib/battle/room-code.ts`). 호스트도 첫 참가자로 함께 등록해
 * 대기실 목록/최종 순위에 동일하게 포함되게 한다.
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<BattleRoomState> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }
  const userId = session.user.id;

  const { vocabularyBookId } = createBattleRoomSchema.parse(await req.json());
  const book = await db.vocabularyBook.findUnique({ where: { id: vocabularyBookId } });
  if (!book || book.user_id !== userId) {
    throw new ApiError("NOT_FOUND", "단어장을 찾을 수 없습니다.");
  }

  for (let attempt = 0; attempt < ROOM_CODE_MAX_ATTEMPTS; attempt++) {
    try {
      const room = await db.$transaction(async (tx) => {
        const created = await tx.battleRoom.create({
          data: {
            room_code: generateRoomCode(),
            host_user_id: userId,
            vocabulary_book_id: vocabularyBookId,
          },
        });
        await tx.battleParticipant.create({
          data: { room_id: created.id, user_id: userId },
        });
        return created;
      });

      return await loadBattleRoomState(room.id);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue;
      }
      throw err;
    }
  }

  throw new ApiError("INTERNAL_ERROR", "방 코드를 생성하지 못했습니다. 다시 시도해주세요.");
});

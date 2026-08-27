import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { requireBattleParticipant, requireBattleRoom } from "@/lib/battle/access";
import { advanceRoundIfEnded } from "@/lib/battle/round-lifecycle";
import { parseBattleQuestions, toPublicChoiceId } from "@/lib/battle/serialize";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { submitBattleAnswerSchema } from "@/lib/validations/battle";
import type { BattleAnswerResult } from "@/types/battle";

import type { NextRequest } from "next/server";

/**
 * 답변 제출. 정답이면 `UPDATE ... WHERE winner_participant_id IS NULL AND ended_at IS NULL` 한
 * 문장으로 "가장 먼저 맞힌 사람"을 원자적으로 확정한다(Postgres read-committed에서 WHERE절이
 * 잠금 획득 후 재평가돼 안전하게 직렬화됨 — SELECT FOR UPDATE 불필요). `ended_at IS NULL` 조건이
 * 없으면 라운드 종료(정답 공개) 이후 도착한 지각 정답이 뒤늦게 당첨 처리되는 TOCTOU가 생긴다.
 * 응답시간은 클라이언트가 보낸 값이 아니라 서버가 라운드 시작 시각과 자신의 처리 시각 차이로
 * 직접 계산한다(치팅 방지, 계획서 C.2 원칙).
 */
export const POST = withApiHandler(
  async (
    req: NextRequest,
    ctx: RouteContext<"/api/battle-rooms/[roomCode]/rounds/[roundNumber]/answer">,
  ): Promise<BattleAnswerResult> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }
    const userId = session.user.id;

    const { roomCode, roundNumber: roundNumberParam } = await ctx.params;
    const roundNumber = Number(roundNumberParam);
    if (!Number.isInteger(roundNumber)) {
      throw new ApiError("NOT_FOUND", "라운드를 찾을 수 없습니다.");
    }

    const room = await requireBattleRoom(roomCode);
    const participant = await requireBattleParticipant(room.id, userId);

    const round = await db.battleRound.findUnique({
      where: { room_id_round_number: { room_id: room.id, round_number: roundNumber } },
    });
    if (!round) {
      throw new ApiError("NOT_FOUND", "라운드를 찾을 수 없습니다.");
    }
    if (round.ended_at) {
      throw new ApiError("CONFLICT", "라운드가 이미 종료됐어요.");
    }

    const { choiceId } = submitBattleAnswerSchema.parse(await req.json());
    const question = parseBattleQuestions(room.questions)[roundNumber - 1];
    if (!question) {
      throw new ApiError("NOT_FOUND", "라운드를 찾을 수 없습니다.");
    }

    // 클라이언트는 `toPublicRound`가 만든 불투명 id(`choice-N`)로만 보기를 알고 있다 — 원본
    // 문제의 `correctAnswer`(예: "correct")를 그대로 비교하면 원본 id를 아는 사람만 통과하므로,
    // 채점도 항상 같은 변환을 거쳐야 클라이언트가 실제로 본 id와 일치시킬 수 있다.
    const isCorrect = choiceId === toPublicChoiceId(question, question.correctAnswer);
    const responseTimeMs = Date.now() - round.started_at.getTime();

    let isWinner = false;
    try {
      isWinner = await db.$transaction(async (tx) => {
        await tx.battleAnswer.create({
          data: {
            round_id: round.id,
            user_id: userId,
            participant_id: participant.id,
            response_time_ms: responseTimeMs,
            is_correct: isCorrect,
          },
        });

        if (!isCorrect) return false;

        const locked = await tx.battleRound.updateMany({
          where: { id: round.id, winner_participant_id: null, ended_at: null },
          data: { winner_participant_id: participant.id },
        });
        if (locked.count !== 1) return false;

        await tx.battleParticipant.update({
          where: { id: participant.id },
          data: { score: { increment: 1 } },
        });
        return true;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ApiError("CONFLICT", "이미 답을 제출했어요.");
      }
      throw err;
    }

    await advanceRoundIfEnded(round.id);

    return { isCorrect, isWinner };
  },
);

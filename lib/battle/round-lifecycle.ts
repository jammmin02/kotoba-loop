import "server-only";

import { triggerBattleEvent } from "@/lib/battle/broadcast";
import { battleChannelName } from "@/lib/battle/channel";
import { BATTLE_ROUND_DURATION_MS } from "@/lib/battle/constants";
import {
  parseBattleQuestions,
  toParticipantSummaries,
  toPublicChoiceId,
  toPublicRound,
} from "@/lib/battle/serialize";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { BattleRoom } from "@/lib/generated/prisma/client";


/**
 * 라운드가 끝났어야 하는지 확인하고, 끝났다면 정답 공개 + 다음 라운드 시작(또는 방 종료)까지
 * 책임진다. 답변 제출/타임아웃 API뿐 아니라 방 상태 조회(GET)에서도 호출한다 — 서버리스 환경엔
 * 백그라운드 타이머가 없으므로, "라운드는 끝났는데 다음 라운드가 없는" 상태를 누군가 다시 조회할
 * 때 스스로 복구하게 만드는 것이 크래시 회복의 유일한 장치다(이 함수는 완전히 멱등하다 — 이미
 * 끝난 라운드/이미 만들어진 다음 라운드/이미 종료된 방에 대해 다시 불러도 아무 일도 하지 않는다).
 */
export async function advanceRoundIfEnded(roundId: string): Promise<void> {
  const round = await db.battleRound.findUnique({ where: { id: roundId }, include: { room: true } });
  if (!round) return;

  if (!round.ended_at) {
    const [answeredCount, participantCount] = await Promise.all([
      db.battleAnswer.count({ where: { round_id: round.id } }),
      db.battleParticipant.count({ where: { room_id: round.room_id } }),
    ]);
    const elapsedMs = Date.now() - round.started_at.getTime();
    const shouldEnd = answeredCount >= participantCount || elapsedMs >= BATTLE_ROUND_DURATION_MS;
    if (!shouldEnd) return;

    // 원자적 잠금(read-committed 하에서 WHERE절이 잠금 획득 후 재평가돼 안전하게 직렬화된다) —
    // 이 UPDATE가 0건이어도(다른 요청이 먼저 끝냈어도) 에러로 취급하지 않고 아래 복구 단계로
    // 그대로 진행한다. "누가 다음 단계를 책임질지"는 뒤이은 다음 라운드 생성의 유니크 제약이
    // 최종적으로 결정한다.
    await db.battleRound.updateMany({
      where: { id: round.id, ended_at: null },
      data: { ended_at: new Date() },
    });
  }

  await completeRoundTransition(round.room, round.round_number, round.winner_participant_id);
}

async function completeRoundTransition(
  room: BattleRoom,
  roundNumber: number,
  winnerParticipantId: string | null,
): Promise<void> {
  if (room.status === "finished") return;

  const nextRoundExists = await db.battleRound.findUnique({
    where: { room_id_round_number: { room_id: room.id, round_number: roundNumber + 1 } },
  });
  if (nextRoundExists) return;

  const questions = parseBattleQuestions(room.questions);
  const question = questions[roundNumber - 1];
  if (!question) return;

  const participants = await db.battleParticipant.findMany({
    where: { room_id: room.id },
    include: { user: true },
  });
  // 정답을 맞힌 참가자가 여럿이어도(`is_correct=true`가 여러 명일 수 있음) 실제 승자는 답변
  // 제출 API가 원자적 UPDATE로 확정해둔 `winner_participant_id` 한 명뿐이다 — 정답 여부가 아니라
  // 이 id로만 승자를 가린다.
  const winner = winnerParticipantId
    ? participants.find((participant) => participant.id === winnerParticipantId)
    : undefined;
  const channel = battleChannelName(room.room_code);

  await triggerBattleEvent(channel, "round-result", {
    roundNumber,
    // 클라이언트가 받은 `choices[].id`는 `choice-N` 형태의 불투명 id다 — 원본 id(`correctAnswer`,
    // 예: "correct")를 그대로 보내면 클라이언트가 자기 화면의 어느 버튼인지 매칭하지 못한다.
    correctChoiceId: toPublicChoiceId(question, question.correctAnswer),
    winnerUserId: winner?.user_id ?? null,
    scoreboard: toParticipantSummaries(participants, room.host_user_id),
  });

  if (roundNumber < room.round_count) {
    const nextQuestion = questions[roundNumber];
    if (!nextQuestion) return;

    try {
      const nextRound = await db.battleRound.create({
        data: {
          room_id: room.id,
          round_number: roundNumber + 1,
          vocabulary_id: nextQuestion.targetId,
        },
        include: { winnerParticipant: { select: { user_id: true } } },
      });
      await triggerBattleEvent(
        channel,
        "round-started",
        toPublicRound(nextRound, nextQuestion, room.round_count),
      );
    } catch (err) {
      // 동시에 두 요청이 여기 도달해도 @@unique([room_id, round_number])가 한쪽만 성공시킨다 —
      // 진 쪽은 이미 다른 요청이 다음 라운드를 만들었다는 뜻이므로 조용히 넘어간다.
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
        throw err;
      }
    }
    return;
  }

  const finished = await db.battleRoom.updateMany({
    where: { id: room.id, status: { not: "finished" } },
    data: { status: "finished" },
  });
  if (finished.count === 1) {
    await triggerBattleEvent(channel, "battle-finished", {
      finalRanking: toParticipantSummaries(participants, room.host_user_id),
    });
  }
}

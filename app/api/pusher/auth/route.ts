import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher/server";

import type { NextRequest } from "next/server";

const PRESENCE_CHANNEL_PATTERN = /^presence-battle-room-([A-Z0-9]{6})$/;

/**
 * `pusher-js`가 프레즌스 채널 구독 시 자동으로 호출하는 인증 엔드포인트 — Pusher SDK가 기대하는
 * `{auth, channel_data}` 원본 응답 형식을 그대로 반환해야 하므로 `withApiHandler`(표준
 * `{success, data}` 봉투)를 쓰지 않는다. 로그인 + 해당 방의 `BattleParticipant`로 이미
 * 등록되어 있는지(= `POST /join`을 먼저 호출했는지)까지 확인한 뒤에만 구독을 허가한다.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const form = await req.formData();
  const socketId = form.get("socket_id");
  const channelName = form.get("channel_name");
  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const match = PRESENCE_CHANNEL_PATTERN.exec(channelName);
  if (!match) {
    return NextResponse.json({ error: "잘못된 채널이에요." }, { status: 400 });
  }

  const room = await db.battleRoom.findUnique({ where: { room_code: match[1] } });
  if (!room) {
    return NextResponse.json({ error: "방을 찾을 수 없습니다." }, { status: 404 });
  }

  const participant = await db.battleParticipant.findUnique({
    where: { room_id_user_id: { room_id: room.id, user_id: session.user.id } },
    include: { user: { select: { nickname: true } } },
  });
  if (!participant) {
    return NextResponse.json({ error: "참가하지 않은 방이에요." }, { status: 403 });
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName, {
    user_id: session.user.id,
    user_info: { nickname: participant.user.nickname },
  });

  return NextResponse.json(authResponse);
}

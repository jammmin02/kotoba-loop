import "server-only";

import { pusherServer } from "@/lib/pusher/server";

/**
 * Pusher 브로드캐스트 실패(설정 오류, 일시적 장애)가 라운드 진행 자체를 막지 않게 한다 — DB
 * 상태 전이(ended_at/다음 라운드 생성/방 종료)가 진실 소스이고, 브로드캐스트는 그걸 각
 * 클라이언트에 더 빨리 알리는 최적화일 뿐이다. 실패해도 다음 GET 조회(`loadBattleRoomState`의
 * 자가 치유)가 결국 같은 상태로 따라잡는다.
 */
export async function triggerBattleEvent(
  channel: string,
  event: string,
  data: unknown,
): Promise<void> {
  try {
    await pusherServer.trigger(channel, event, data);
  } catch (err) {
    console.error(`[battle] Pusher trigger 실패 (channel=${channel}, event=${event}):`, err);
  }
}

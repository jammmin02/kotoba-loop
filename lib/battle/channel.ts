/** Pusher 프레즌스 채널 이름 — 참가자 입장/퇴장은 이 채널의 내장 member_added/member_removed로,
 * 라운드 진행(round-started/round-result/battle-finished)은 서버가 직접 트리거해 전파한다.
 * 클라이언트 훅(`use-battle-channel.ts`)도 이 이름 규칙을 알아야 하므로, 이 파일은 순수
 * 문자열 유틸만 두고 서버 전용 코드(`lib/pusher/server.ts` 등)를 끌어오지 않는다 — 끌어오면
 * "use client" 훅이 서버 전용 모듈을 번들에 포함하려다 빌드 에러가 난다. Pusher 트리거는
 * `lib/battle/broadcast.ts`(서버 전용)에 따로 둔다. */
export function battleChannelName(roomCode: string): string {
  return `presence-battle-room-${roomCode}`;
}

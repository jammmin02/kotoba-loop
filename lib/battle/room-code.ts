/** 0/O, 1/I처럼 헷갈리는 문자를 뺀 방 코드용 문자셋. */
const ROOM_CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const ROOM_CODE_LENGTH = 6;

/**
 * 6자리 영숫자 방 코드를 생성한다(계획서 PROMPT 54). 유니크 보장은 이 함수가 아니라 호출자가
 * `BattleRoom.room_code`의 `@unique` 제약 위반(P2002)을 잡아 재시도하는 방식으로 처리한다 —
 * 사전 존재 조회 없이 낙관적으로 시도하는 편이 충돌이 드문 6자리 공간(32^6 ≈ 10억)에서 더 싸다.
 */
export function generateRoomCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

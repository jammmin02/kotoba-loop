import assert from "node:assert/strict";
import { test } from "node:test";

import { generateRoomCode } from "@/lib/battle/room-code";

test("항상 6자리 코드를 만든다", () => {
  assert.equal(generateRoomCode().length, 6);
  assert.equal(generateRoomCode(() => 0).length, 6);
  assert.equal(generateRoomCode(() => 0.999999).length, 6);
});

test("혼동되는 문자(0/O/1/I)를 쓰지 않는다", () => {
  const code = generateRoomCode(() => Math.random());
  for (const char of code) {
    assert.ok(!"01OI".includes(char), `혼동 문자 '${char}'가 포함됨: ${code}`);
  }
});

test("동일한 random 시퀀스를 넘기면 항상 같은 코드가 나온다(순수 함수)", () => {
  const fixedRandom = () => 0.42;
  assert.equal(generateRoomCode(fixedRandom), generateRoomCode(fixedRandom));
});

test("random이 다르면 대체로 다른 코드가 나온다", () => {
  const codes = new Set(Array.from({ length: 50 }, () => generateRoomCode()));
  assert.ok(codes.size > 40, "50개 중 40개 넘게 서로 달라야 한다(충돌 가능성은 낮아야 함)");
});

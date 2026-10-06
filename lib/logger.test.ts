import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatLogLine, serializeError } from "./logger";

describe("serializeError", () => {
  it("Error에서 name/message/code/stack만 뽑는다", () => {
    const err = Object.assign(new Error("boom"), { code: "P2002", meta: { secret: "x" } });
    const out = serializeError(err);
    assert.equal(out.name, "Error");
    assert.equal(out.message, "boom");
    assert.equal(out.code, "P2002");
    assert.ok(out.stack);
    assert.equal("meta" in out, false);
  });
  it("Error가 아닌 값도 문자열로 직렬화한다", () => {
    assert.deepEqual(serializeError("oops"), { name: "NonError", message: "oops" });
  });
  it("stack은 줄 수를 제한한다", () => {
    const err = new Error("deep");
    err.stack = Array.from({ length: 30 }, (_, i) => `line${i}`).join("\n");
    assert.equal(serializeError(err).stack?.split("\n").length, 8);
  });
});

describe("formatLogLine", () => {
  it("scope/level/message/context를 JSON 한 줄로 만든다", () => {
    const line = JSON.parse(formatLogLine("error", "ocr", "실패", new Error("x"), { id: "1" }));
    assert.equal(line.level, "error");
    assert.equal(line.scope, "ocr");
    assert.equal(line.error.message, "x");
    assert.deepEqual(line.context, { id: "1" });
  });
  it("에러·컨텍스트가 없으면 해당 키를 생략한다", () => {
    const line = JSON.parse(formatLogLine("info", "s", "m"));
    assert.equal("error" in line, false);
    assert.equal("context" in line, false);
  });
});

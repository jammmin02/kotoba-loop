import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isLoginThrottled, isRegisterThrottled, pickClientIp } from "./auth-throttle-policy";

const headers = (map: Record<string, string>) => ({ get: (name: string) => map[name] ?? null });

describe("isLoginThrottled", () => {
  it("한도 미만이면 허용", () => {
    assert.equal(isLoginThrottled({ emailFailures: 4, ipFailures: 29 }), false);
  });
  it("이메일 실패 5회면 차단", () => {
    assert.equal(isLoginThrottled({ emailFailures: 5, ipFailures: 0 }), true);
  });
  it("IP 실패 30회면 차단", () => {
    assert.equal(isLoginThrottled({ emailFailures: 0, ipFailures: 30 }), true);
  });
});

describe("isRegisterThrottled", () => {
  it("IP당 5회부터 차단", () => {
    assert.equal(isRegisterThrottled(4), false);
    assert.equal(isRegisterThrottled(5), true);
  });
});

describe("pickClientIp", () => {
  it("x-forwarded-for의 첫 값을 쓴다", () => {
    assert.equal(pickClientIp(headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })), "1.1.1.1");
  });
  it("헤더가 없으면 unknown", () => {
    assert.equal(pickClientIp(headers({})), "unknown");
  });
});

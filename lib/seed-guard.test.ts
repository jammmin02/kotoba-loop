import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ALLOW_REMOTE_FLAG, assertTestSeedAllowed, evaluateTestSeedGuard } from "./seed-guard";

const LOCAL_URL = "postgresql://user:pw@localhost:5432/kotoba_loop?schema=public";
const NEON_URL =
  "postgresql://neon-user:s3cr3t-pw@ep-example-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const evaluate = (databaseUrl: string | undefined, argv: string[] = [], nodeEnv?: string) =>
  evaluateTestSeedGuard({ databaseUrl, nodeEnv, argv });

describe("evaluateTestSeedGuard", () => {
  it("내 컴퓨터의 DB는 플래그 없이 허용한다", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]", "LOCALHOST"]) {
      const result = evaluate(`postgresql://u:p@${host}:5432/db`);
      assert.equal(result.allowed, true, host);
      assert.equal(result.allowed && result.remote, false, host);
    }
  });

  it("원격 DB는 플래그가 없으면 거절하고 호스트만 알려준다", () => {
    const result = evaluate(NEON_URL);
    assert.equal(result.allowed, false);
    assert.ok(!result.allowed && result.reason.includes("ep-example-pooler"));
    assert.ok(!result.allowed && result.reason.includes(ALLOW_REMOTE_FLAG));
  });

  it("거절 메시지에는 접속 정보(사용자·비밀번호)가 들어가지 않는다", () => {
    const result = evaluate(NEON_URL);
    assert.equal(result.allowed, false);
    const reason = result.allowed ? "" : result.reason;
    assert.ok(!reason.includes("s3cr3t-pw"));
    assert.ok(!reason.includes("neon-user"));
    assert.ok(!reason.includes("postgresql://"));
  });

  it("원격 DB도 명시적 플래그가 있으면 허용하되 원격임을 표시한다", () => {
    const result = evaluate(NEON_URL, ["tsx", "prisma/seed.ts", ALLOW_REMOTE_FLAG]);
    assert.equal(result.allowed, true);
    assert.equal(result.allowed && result.remote, true);
    assert.equal(
      result.allowed && result.host,
      "ep-example-pooler.c-4.ap-southeast-1.aws.neon.tech",
    );
  });

  it("비슷해 보이는 플래그나 값이 붙은 플래그는 동의로 보지 않는다", () => {
    assert.equal(evaluate(NEON_URL, ["--allow-remote=true"]).allowed, false);
    assert.equal(evaluate(NEON_URL, ["--allowremote"]).allowed, false);
    assert.equal(evaluate(NEON_URL, ["allow-remote"]).allowed, false);
  });

  it("NODE_ENV=production에서는 로컬이든 플래그가 있든 항상 거절한다", () => {
    assert.equal(evaluate(LOCAL_URL, [], "production").allowed, false);
    assert.equal(evaluate(NEON_URL, [ALLOW_REMOTE_FLAG], "production").allowed, false);
  });

  it("DATABASE_URL이 없거나 해석할 수 없으면 거절한다", () => {
    assert.equal(evaluate(undefined).allowed, false);
    assert.equal(evaluate("").allowed, false);
    assert.equal(evaluate("이건 URL이 아니에요").allowed, false);
  });

  it("호스트 이름에 localhost가 들어 있는 원격 주소는 로컬로 취급하지 않는다", () => {
    assert.equal(evaluate("postgresql://u:p@localhost.evil.example.com:5432/db").allowed, false);
    assert.equal(evaluate("postgresql://u:p@db.localhost.example.com/db").allowed, false);
  });
});

describe("assertTestSeedAllowed", () => {
  it("거절되면 예외를 던지고, 허용되면 아무것도 던지지 않는다", () => {
    assert.throws(
      () => assertTestSeedAllowed({ databaseUrl: NEON_URL, nodeEnv: undefined, argv: [] }),
      /호스트가 내 컴퓨터가 아니에요/,
    );
    assert.doesNotThrow(() =>
      assertTestSeedAllowed({ databaseUrl: LOCAL_URL, nodeEnv: undefined, argv: [] }),
    );
  });
});

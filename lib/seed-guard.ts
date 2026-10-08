/**
 * 테스트 계정 시드 스크립트(`prisma/seed-test-account.ts`, `prisma/seed-multi-book-test.ts`)용 안전장치.
 *
 * 이 스크립트들은 비밀번호가 저장소에 그대로 적힌 계정을 만든다. 공유·운영 DB에서 실행하면 누구나
 * 그 비밀번호로 로그인할 수 있으므로, 기본은 "내 컴퓨터의 DB"에서만 실행되게 막고 원격 DB에는 명시적
 * 플래그를 줄 때만 허용한다. `NODE_ENV=production`에서는 어떤 경우에도 실행하지 않는다.
 */

/** 원격 DB(Neon 등)에서도 실행하겠다는 명시적 동의. 값 없이 이 플래그 그대로여야 한다. */
export const ALLOW_REMOTE_FLAG = "--allow-remote";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export interface TestSeedGuardInput {
  databaseUrl: string | undefined;
  nodeEnv: string | undefined;
  argv: readonly string[];
}

export type TestSeedGuardResult =
  { allowed: true; host: string; remote: boolean } | { allowed: false; reason: string };

/**
 * 실행해도 되는지 판정한다. 오류 메시지에는 접속 정보(사용자·비밀번호)를 절대 싣지 않고 호스트
 * 이름만 보여준다.
 */
export function evaluateTestSeedGuard({
  databaseUrl,
  nodeEnv,
  argv,
}: TestSeedGuardInput): TestSeedGuardResult {
  if (nodeEnv === "production") {
    return {
      allowed: false,
      reason: "NODE_ENV=production 에서는 고정 비밀번호 테스트 계정을 만들 수 없어요.",
    };
  }
  if (!databaseUrl) {
    return { allowed: false, reason: "DATABASE_URL이 설정되어 있지 않아요." };
  }

  let host: string;
  try {
    // IPv6 호스트는 `[::1]` 형태로 오므로 대괄호를 벗겨 비교한다.
    host = new URL(databaseUrl).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return { allowed: false, reason: "DATABASE_URL을 해석할 수 없어요." };
  }
  if (!host) {
    return { allowed: false, reason: "DATABASE_URL에 호스트가 없어요." };
  }

  if (LOCAL_HOSTS.has(host)) return { allowed: true, host, remote: false };

  if (argv.includes(ALLOW_REMOTE_FLAG)) return { allowed: true, host, remote: true };

  return {
    allowed: false,
    reason:
      `DB 호스트가 내 컴퓨터가 아니에요(${host}). 이 스크립트가 만드는 계정은 비밀번호가 ` +
      `저장소에 공개돼 있어, 공유·운영 DB에서는 누구나 로그인할 수 있게 돼요. 로컬 DB에서 실행하거나, ` +
      `정말 이 DB가 일회용 개발 DB라면 ${ALLOW_REMOTE_FLAG} 를 붙여 다시 실행하세요.`,
  };
}

/** 허용되지 않으면 예외를 던진다(호출부가 DB에 접속하기 전에 불러야 한다). */
export function assertTestSeedAllowed(input: TestSeedGuardInput): void {
  const result = evaluateTestSeedGuard(input);
  if (!result.allowed) throw new Error(result.reason);
  if (result.remote) {
    console.warn(
      `⚠ 원격 DB(${result.host})에 고정 비밀번호 테스트 계정을 만듭니다. 일회용 개발 DB에서만 쓰고, 끝나면 계정을 지우세요.`,
    );
  }
}

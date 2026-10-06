// 로그인·가입 시도 제한의 순수 판정 로직 — server-only 의존이 없어 단위 테스트할 수 있다.

export const LOGIN_WINDOW_MS = 15 * 60_000;
/** 같은 이메일로 이 횟수만큼 실패하면 윈도 안에서는 비밀번호가 맞아도 로그인할 수 없다. */
export const LOGIN_MAX_FAILURES_PER_EMAIL = 5;
/** 한 IP에서 여러 이메일을 돌려 가며 시도하는 공격을 막는다(학교 공용망을 고려해 넉넉히). */
export const LOGIN_MAX_FAILURES_PER_IP = 30;

export const REGISTER_WINDOW_MS = 60 * 60_000;
export const REGISTER_MAX_PER_IP = 5;

export function isLoginThrottled(counts: { emailFailures: number; ipFailures: number }): boolean {
  return (
    counts.emailFailures >= LOGIN_MAX_FAILURES_PER_EMAIL ||
    counts.ipFailures >= LOGIN_MAX_FAILURES_PER_IP
  );
}

export function isRegisterThrottled(ipAttempts: number): boolean {
  return ipAttempts >= REGISTER_MAX_PER_IP;
}

/** x-forwarded-for의 첫 값(원 클라이언트)을 쓰고, 헤더가 없으면 "unknown"으로 묶는다. */
export function pickClientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

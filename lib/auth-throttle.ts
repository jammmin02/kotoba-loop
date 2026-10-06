import "server-only";

import {
  LOGIN_WINDOW_MS,
  REGISTER_WINDOW_MS,
  isLoginThrottled,
  isRegisterThrottled,
} from "@/lib/auth-throttle-policy";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * 로그인 실패·가입 시도를 DB(AuthAttempt)에 남기고 최근 구간을 집계해 제한한다. 존재하지 않는 이메일도
 * 똑같이 세므로, 잠금 여부로 계정 존재를 알아낼 수 없다. 조회·기록이 실패하면 정상 사용자를 막지 않도록
 * 통과시킨다(fail-open) — 이 장치는 방어 계층이지 인증 자체가 아니다.
 */

const RETENTION_MS = 24 * 60 * 60_000;

export async function isLoginBlocked(email: string, ip: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - LOGIN_WINDOW_MS);
    const [emailFailures, ipFailures] = await Promise.all([
      db.authAttempt.count({ where: { kind: "login_fail", email, created_at: { gte: since } } }),
      db.authAttempt.count({ where: { kind: "login_fail", ip, created_at: { gte: since } } }),
    ]);
    return isLoginThrottled({ emailFailures, ipFailures });
  } catch (err) {
    logger.error("auth-throttle", "로그인 시도 조회 실패, 허용", err);
    return false;
  }
}

export async function recordLoginFailure(email: string, ip: string): Promise<void> {
  try {
    await db.authAttempt.create({ data: { kind: "login_fail", email, ip } });
    // 오래된 기록은 기록할 때 함께 정리한다(별도 크론 없이 테이블이 무한히 자라지 않게).
    await db.authAttempt.deleteMany({
      where: { created_at: { lt: new Date(Date.now() - RETENTION_MS) } },
    });
  } catch (err) {
    logger.error("auth-throttle", "로그인 실패 기록 실패", err);
  }
}

/** 로그인에 성공하면 그 이메일의 누적 실패를 지워 잠금 카운트를 초기화한다. */
export async function clearLoginFailures(email: string): Promise<void> {
  try {
    await db.authAttempt.deleteMany({ where: { kind: "login_fail", email } });
  } catch (err) {
    logger.error("auth-throttle", "로그인 실패 기록 초기화 실패", err);
  }
}

export async function isRegisterBlocked(ip: string): Promise<boolean> {
  try {
    const attempts = await db.authAttempt.count({
      where: {
        kind: "register",
        ip,
        created_at: { gte: new Date(Date.now() - REGISTER_WINDOW_MS) },
      },
    });
    return isRegisterThrottled(attempts);
  } catch (err) {
    logger.error("auth-throttle", "가입 시도 조회 실패, 허용", err);
    return false;
  }
}

export async function recordRegisterAttempt(ip: string): Promise<void> {
  try {
    await db.authAttempt.create({ data: { kind: "register", ip } });
  } catch (err) {
    logger.error("auth-throttle", "가입 시도 기록 실패", err);
  }
}

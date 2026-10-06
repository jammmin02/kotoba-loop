/**
 * 서버 공용 로거. 로그 한 줄을 JSON으로 내보내 Vercel 로그에서 scope/level로 검색·필터할 수 있게 한다.
 * 에러는 name/message/code/stack만 뽑아 직렬화한다 — 요청 본문이나 Prisma의 쿼리 인자처럼 사용자 입력이
 * 섞인 필드는 의도적으로 싣지 않는다. 브라우저 코드(`components/`)는 이 로거를 쓰지 않고 console을 그대로 쓴다.
 */

export type LogContext = Record<string, unknown>;

export interface SerializedError {
  name: string;
  message: string;
  code?: string;
  stack?: string;
}

const MAX_STACK_LINES = 8;

export function serializeError(err: unknown): SerializedError {
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code;
    return {
      name: err.name,
      message: err.message,
      ...(typeof code === "string" ? { code } : {}),
      ...(err.stack ? { stack: err.stack.split("\n").slice(0, MAX_STACK_LINES).join("\n") } : {}),
    };
  }
  return { name: "NonError", message: typeof err === "string" ? err : String(err) };
}

type Level = "info" | "warn" | "error";

export function formatLogLine(
  level: Level,
  scope: string,
  message: string,
  err?: unknown,
  context?: LogContext,
): string {
  return JSON.stringify({
    level,
    scope,
    message,
    ...(err !== undefined ? { error: serializeError(err) } : {}),
    ...(context ? { context } : {}),
  });
}

export const logger = {
  info(scope: string, message: string, context?: LogContext) {
    console.info(formatLogLine("info", scope, message, undefined, context));
  },
  warn(scope: string, message: string, err?: unknown, context?: LogContext) {
    console.warn(formatLogLine("warn", scope, message, err, context));
  },
  error(scope: string, message: string, err?: unknown, context?: LogContext) {
    console.error(formatLogLine("error", scope, message, err, context));
  },
};

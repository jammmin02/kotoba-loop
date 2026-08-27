import "server-only";

import { ApiError } from "@/lib/api/error";

/**
 * In-memory sliding-window limiter — same single-process assumption as the
 * `inflightRequests` map in `lib/ai/cache.ts` (no Redis/DB in this stack).
 * Scoped by an explicit `scope` string so different AI features (e.g.
 * PROMPT 42 natural search vs a future feature) don't share one budget.
 */
const requestLog = new Map<string, number[]>();

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 10;

/** Throws `ApiError("RATE_LIMITED", ...)` once `userId` exceeds `max` requests within `windowMs` for `scope`. */
export function enforceRateLimit(
  scope: string,
  userId: string,
  { windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX_REQUESTS }: RateLimitOptions = {},
): void {
  const key = `${scope}:${userId}`;
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= max) {
    requestLog.set(key, recent);
    throw new ApiError("RATE_LIMITED", "요청이 너무 많아요. 잠시 후 다시 시도해주세요.");
  }

  recent.push(now);
  requestLog.set(key, recent);
}

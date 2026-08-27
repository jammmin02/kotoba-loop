import "server-only";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  maxRetries: number;
  isRetryable: (err: unknown) => boolean;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Retries `fn` with exponential backoff + jitter. `attempt` starts at 0.
 * Stops immediately (no retry) once `isRetryable` returns false.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  { maxRetries, isRetryable, baseDelayMs = 500, maxDelayMs = 8_000 }: RetryOptions,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !isRetryable(err)) throw err;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jittered = backoff * (0.5 + Math.random() * 0.5);
      await sleep(jittered);
    }
  }
  throw lastError;
}

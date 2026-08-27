import "server-only";

/**
 * Runs `worker` over `items` with at most `concurrency` calls in flight at once.
 *
 * `worker` must never reject — a batch item that can fail (e.g. an AI call) should
 * catch its own error and record the outcome itself, exactly like the per-word
 * calls in lib/ocr/word-batch.ts do. If `worker` rejects anyway, `Promise.all`
 * below rejects and aborts every other in-flight item, which defeats the
 * "one word's failure shouldn't stop the batch" requirement (kotoba-loop-roadmap.md
 * PROMPT 30).
 */
export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;

  async function runNext(): Promise<void> {
    const index = cursor++;
    if (index >= items.length) return;
    await worker(items[index], index);
    return runNext();
  }

  const poolSize = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: poolSize }, () => runNext()));
}

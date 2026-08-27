import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { runOcrWordBatchAnalyze } from "@/lib/ocr/word-batch";
import type { OcrWordBatchJobView } from "@/types/ocr-word-batch";

import type { NextRequest } from "next/server";

/**
 * Same rationale as the OCR route's `maxDuration` (lib/ocr/client.ts / .../[id]/ocr/route.ts):
 * batching up to MAX_OCR_WORDS words through PROMPT 13's per-word analysis, BATCH_CONCURRENCY at
 * a time, can legitimately take tens of seconds. `runOcrWordBatchAnalyze` persists each word's
 * outcome as it settles, so a timeout here just means the client's next POST resumes only the
 * still-pending words instead of losing progress.
 */
export const maxDuration = 60;

/**
 * Runs (or resumes) the per-word batch analysis for a photo whose word candidates were already
 * extracted via `POST .../words`. Safe to call again after a partial failure or timeout — only
 * words still marked "pending" are retried, already-analyzed or already-failed words are left as
 * is (kotoba-loop-roadmap.md PROMPT 30: a partial failure must not restart the whole batch).
 */
export const POST = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/vocabulary-photos/[id]/words/analyze">,
  ): Promise<OcrWordBatchJobView> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    return runOcrWordBatchAnalyze(id, session.user.id);
  },
);

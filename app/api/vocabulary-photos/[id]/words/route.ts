import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { getOcrWordJob, getOrCreateOcrWordJob } from "@/lib/ocr/word-batch";
import type { OcrWordBatchJobView } from "@/types/ocr-word-batch";

import type { NextRequest } from "next/server";

/**
 * Runs the OCR-correction + word-splitting AI call (PROMPT 13 재사용, kotoba-loop-roadmap.md
 * PROMPT 30) for a photo whose OCR text (PROMPT 29) is already extracted, and persists it as the
 * job document that `.../words/analyze` later fills in. Idempotent — re-POSTing an already
 * extracted photo just returns the existing job instead of re-running the AI call, so the client
 * can safely call this to show "약 N개 단어 발견" before asking the user to confirm starting the
 * (slower, costlier) per-word batch analysis.
 */
export const POST = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/vocabulary-photos/[id]/words">,
  ): Promise<OcrWordBatchJobView> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    return getOrCreateOcrWordJob(id, session.user.id);
  },
);

/** Polls the current extraction/analysis progress — see `.../words/analyze` for what advances it. */
export const GET = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/vocabulary-photos/[id]/words">,
  ): Promise<OcrWordBatchJobView> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    return getOcrWordJob(id, session.user.id);
  },
);

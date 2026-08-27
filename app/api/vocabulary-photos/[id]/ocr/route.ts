import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { processPhotoOcr } from "@/lib/ocr/process-photo";
import type { OcrResult } from "@/types/ocr";

import type { NextRequest } from "next/server";

/**
 * Vercel's default Function timeout is 10s; Hobby's plan max is 60s. Tesseract.js runs
 * in-process (no external OCR API — kotoba-loop-roadmap.md C.1's 2026-08-25 decision), so a
 * dense/large photo can legitimately take tens of seconds. lib/ocr/client.ts enforces its own
 * shorter internal timeout (OCR_TIMEOUT_MS) so a slow photo returns a clean OCR_TIMEOUT error
 * instead of the platform abruptly killing the function mid-request.
 */
export const maxDuration = 60;

export const POST = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/vocabulary-photos/[id]/ocr">,
  ): Promise<OcrResult> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    return processPhotoOcr(id, session.user.id);
  },
);

import { analyzeWord, type AnalyzeWordResult } from "@/lib/ai/word-analysis";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { analyzeWordSchema } from "@/lib/validations/ai";

import type { NextRequest } from "next/server";

export const POST = withApiHandler(async (req: NextRequest): Promise<AnalyzeWordResult> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const body = await req.json();
  const { word } = analyzeWordSchema.parse(body);

  return analyzeWord(word, session.user.id);
});

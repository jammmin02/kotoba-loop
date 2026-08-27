import { compareWords } from "@/lib/ai/word-comparison";
import type { CompareWordsResult } from "@/lib/ai/word-comparison";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { compareWordsSchema } from "@/lib/validations/ai";

import type { NextRequest } from "next/server";

export const POST = withApiHandler(async (req: NextRequest): Promise<CompareWordsResult> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { words } = compareWordsSchema.parse(await req.json());

  return compareWords(words, session.user.id);
});

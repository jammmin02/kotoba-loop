import { enforceRateLimit } from "@/lib/ai/rate-limit";
import { chatAboutWord, type WordChatResult } from "@/lib/ai/word-chat";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { wordChatSchema } from "@/lib/validations/ai";

import type { NextRequest } from "next/server";

export const POST = withApiHandler(async (req: NextRequest): Promise<WordChatResult> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  enforceRateLimit("word_chat", session.user.id);

  const body = await req.json();
  const { word, question, history } = wordChatSchema.parse(body);

  return chatAboutWord(word, question, history ?? []);
});

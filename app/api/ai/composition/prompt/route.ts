import { generateCompositionPrompt } from "@/lib/ai/composition";
import { runWithAiUser } from "@/lib/ai/usage-context";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { requireOwnedCompositionSession } from "@/lib/composition/session";
import { compositionPromptRequestSchema } from "@/lib/validations/composition";

import type { NextRequest } from "next/server";

export interface CompositionPromptResponse {
  korean: string;
}

/**
 * 한국어 출제 1문장. 출제는 일부러 캐시하지 않는다 — 같은 설정이면 항상 같은 문제가 나오기 때문이다.
 * 한도는 runStructuredAnalysis 안에서 기존 AI 한도(AiUsageLog 집계)에 그대로 합산된다.
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<CompositionPromptResponse> => {
  const session = await auth();
  if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");

  const { sessionId, exclude } = compositionPromptRequestSchema.parse(await req.json());
  const row = await requireOwnedCompositionSession(sessionId, session.user.id);
  if (row.finished_at) throw new ApiError("CONFLICT", "이미 끝난 작문 세션이에요.");

  return runWithAiUser(session.user.id, () =>
    generateCompositionPrompt(
      {
        situation: row.situation,
        vocabLevel: row.vocab_level,
        compositionLevel: row.composition_level,
        tone: row.tone,
      },
      exclude ?? [],
    ),
  );
});

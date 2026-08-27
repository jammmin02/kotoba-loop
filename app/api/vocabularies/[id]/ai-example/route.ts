import { generateExampleBySituation, type GenerateExampleResult } from "@/lib/ai/example-by-situation";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateExampleSchema } from "@/lib/validations/ai";
import { requireOwnedVocabulary } from "@/lib/vocabulary-ownership";

import type { NextRequest } from "next/server";

export const POST = withApiHandler(
  async (
    req: NextRequest,
    ctx: RouteContext<"/api/vocabularies/[id]/ai-example">,
  ): Promise<GenerateExampleResult> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    await requireOwnedVocabulary(id, session.user.id);

    const body = await req.json();
    const { situation } = generateExampleSchema.parse(body);

    const vocabulary = await db.vocabulary.findUniqueOrThrow({
      where: { id },
      select: { word: true },
    });

    return generateExampleBySituation(vocabulary.word, situation, session.user.id);
  },
);

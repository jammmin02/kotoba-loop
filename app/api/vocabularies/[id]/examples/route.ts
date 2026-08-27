import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addExampleSentenceSchema } from "@/lib/validations/vocabulary";
import { requireOwnedVocabulary } from "@/lib/vocabulary-ownership";
import type { ExampleSentenceRecord } from "@/types/vocabulary";

import type { NextRequest } from "next/server";

export const POST = withApiHandler(
  async (
    req: NextRequest,
    ctx: RouteContext<"/api/vocabularies/[id]/examples">,
  ): Promise<ExampleSentenceRecord> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    await requireOwnedVocabulary(id, session.user.id);

    const body = await req.json();
    const { japanese, korean, source } = addExampleSentenceSchema.parse(body);

    return db.exampleSentence.create({
      data: { vocabulary_id: id, japanese, korean, source: source ?? null },
    });
  },
);

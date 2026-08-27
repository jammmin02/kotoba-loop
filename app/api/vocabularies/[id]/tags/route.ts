import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyTagSchema } from "@/lib/validations/tag";
import { requireOwnedVocabulary } from "@/lib/vocabulary-ownership";
import type { TagSummary } from "@/types/tag";

import type { NextRequest } from "next/server";

async function getTags(vocabularyId: string): Promise<{ tags: TagSummary[] }> {
  const vocabularyTags = await db.vocabularyTag.findMany({
    where: { vocabulary_id: vocabularyId },
    select: { tag: { select: { id: true, name: true } } },
    orderBy: { tag: { name: "asc" } },
  });

  return { tags: vocabularyTags.map((vt) => vt.tag) };
}

export const POST = withApiHandler(
  async (
    req: NextRequest,
    ctx: RouteContext<"/api/vocabularies/[id]/tags">,
  ): Promise<{ tags: TagSummary[] }> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    await requireOwnedVocabulary(id, session.user.id);

    const body = await req.json();
    const { tagId } = vocabularyTagSchema.parse(body);

    const tag = await db.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.user_id !== session.user.id) {
      throw new ApiError("NOT_FOUND", "태그를 찾을 수 없습니다.");
    }

    await db.vocabularyTag.upsert({
      where: { vocabulary_id_tag_id: { vocabulary_id: id, tag_id: tagId } },
      update: {},
      create: { vocabulary_id: id, tag_id: tagId },
    });

    return getTags(id);
  },
);

export const DELETE = withApiHandler(
  async (
    req: NextRequest,
    ctx: RouteContext<"/api/vocabularies/[id]/tags">,
  ): Promise<{ tags: TagSummary[] }> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    await requireOwnedVocabulary(id, session.user.id);

    const tagId = req.nextUrl.searchParams.get("tagId");
    if (!tagId) {
      throw new ApiError("VALIDATION_ERROR", "해제할 태그를 지정해주세요.");
    }

    await db.vocabularyTag.deleteMany({ where: { vocabulary_id: id, tag_id: tagId } });

    return getTags(id);
  },
);

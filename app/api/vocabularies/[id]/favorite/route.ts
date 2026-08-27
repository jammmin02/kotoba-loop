import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireOwnedVocabulary } from "@/lib/vocabulary-ownership";

import type { NextRequest } from "next/server";

async function setFavorite(
  ctx: RouteContext<"/api/vocabularies/[id]/favorite">,
  isFavorite: boolean,
): Promise<{ id: string; isFavorite: boolean }> {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { id } = await ctx.params;
  await requireOwnedVocabulary(id, session.user.id);

  await db.userVocabulary.update({
    where: { user_id_vocabulary_id: { user_id: session.user.id, vocabulary_id: id } },
    data: { is_favorite: isFavorite },
  });

  return { id, isFavorite };
}

export const POST = withApiHandler(
  (_req: NextRequest, ctx: RouteContext<"/api/vocabularies/[id]/favorite">) =>
    setFavorite(ctx, true),
);

export const DELETE = withApiHandler(
  (_req: NextRequest, ctx: RouteContext<"/api/vocabularies/[id]/favorite">) =>
    setFavorite(ctx, false),
);

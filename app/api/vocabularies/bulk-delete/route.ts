import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bulkDeleteSchema } from "@/lib/validations/vocabulary";
import { requireOwnedVocabularies } from "@/lib/vocabulary-ownership";

import type { NextRequest } from "next/server";

/**
 * 선택한 단어를 한 번에 삭제한다 — 단일 삭제(`DELETE /api/vocabularies/[id]`)와 같은 의미다.
 * 뜻/예문/이미지/단어장 연결/학습 기록은 DB cascade로 함께 지워지고, 같은 단어가 여러 단어장에
 * 연결돼 있었다면 모든 단어장에서 사라진다. 하나라도 내 단어가 아니면 전체를 거절한다.
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<{ deletedCount: number }> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { ids } = bulkDeleteSchema.parse(await req.json());
  const uniqueIds = [...new Set(ids)];
  await requireOwnedVocabularies(uniqueIds, session.user.id);

  const { count } = await db.vocabulary.deleteMany({ where: { id: { in: uniqueIds } } });
  return { deletedCount: count };
});

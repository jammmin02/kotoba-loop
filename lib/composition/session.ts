import "server-only";

import { ApiError } from "@/lib/api/error";
import { db } from "@/lib/db";

/** 본인 소유 세션만 돌려준다. 남의 세션은 존재 여부를 숨기려고 같은 NOT_FOUND로 응답한다. */
export async function requireOwnedCompositionSession(sessionId: string, userId: string) {
  const found = await db.compositionSession.findFirst({
    where: { id: sessionId, user_id: userId },
  });
  if (!found) throw new ApiError("NOT_FOUND", "작문 세션을 찾을 수 없습니다.");
  return found;
}

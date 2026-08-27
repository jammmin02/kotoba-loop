import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { checkDuplicatesSchema } from "@/lib/validations/vocabulary";
import { duplicateKey, findExistingVocabularies } from "@/lib/vocabulary-duplicate";
import type { DuplicateCheckResult } from "@/types/vocabulary";

import type { NextRequest } from "next/server";

/**
 * 사진 단어장 검수(PROMPT 31) 최종 저장 직전에, 선택된 단어들을 사용자가 이미 보유한 단어
 * 전체(단어장 구분 없이 `UserVocabulary` 기준)와 word+reading 정확 일치로 비교한다.
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<DuplicateCheckResult[]> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const body = await req.json();
  const { items } = checkDuplicatesSchema.parse(body);

  const existingByKey = await findExistingVocabularies(items, session.user.id);

  return items.map((item) => {
    const existing = existingByKey.get(duplicateKey(item.word, item.reading));
    return existing ? { isDuplicate: true, existing } : { isDuplicate: false };
  });
});

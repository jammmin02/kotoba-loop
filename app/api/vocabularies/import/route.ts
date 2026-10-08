import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { assertCanWrite } from "@/lib/moderation/restriction";
import { importVocabularyChunk } from "@/lib/vocabulary-io/import-service";
import { importChunkSchema } from "@/lib/vocabulary-io/schema";
import type { ImportChunkResult } from "@/lib/vocabulary-io/schema";
import type { UnlockedAchievementView } from "@/types/achievement";

import type { NextRequest } from "next/server";

export type ImportVocabularyResponse = ImportChunkResult & {
  unlockedAchievements: UnlockedAchievementView[];
};

/**
 * 파일에서 읽은 단어를 최대 `IMPORT_CHUNK_SIZE`개씩 저장한다. 큰 파일은 화면이 나눠서 여러 번
 * 호출하고(진행률 표시), 항목마다 성공/건너뜀/실패가 따로 보고돼 일부만 문제여도 나머지는 저장된다.
 * 항목 하나하나의 검증과 소유권 확인은 서비스가 다시 한다 — 화면이 보낸 값을 믿지 않는다.
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<ImportVocabularyResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }
  await assertCanWrite(session.user.id);

  const input = importChunkSchema.parse(await req.json());
  return importVocabularyChunk(session.user.id, input);
});

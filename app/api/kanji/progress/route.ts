import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { getKanjiStatusCounts } from "@/lib/study/stats";
import type { KanjiProgressResponse } from "@/types/kanji";

export const GET = withApiHandler(async (): Promise<KanjiProgressResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  return getKanjiStatusCounts(session.user.id);
});

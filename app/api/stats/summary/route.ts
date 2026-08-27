import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { getStudyPeriodCounts, getWordStatusCounts } from "@/lib/study/stats";
import type { StatsSummaryResponse } from "@/types/stats";

export const GET = withApiHandler(async (): Promise<StatsSummaryResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const userId = session.user.id;
  const [words, studyCounts] = await Promise.all([
    getWordStatusCounts(userId),
    getStudyPeriodCounts(userId, new Date()),
  ]);

  return { words, studyCounts };
});

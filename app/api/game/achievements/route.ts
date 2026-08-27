import { getAchievementsView } from "@/lib/achievement/service";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import type { AchievementsResponse } from "@/types/achievement";

export const GET = withApiHandler(async (): Promise<AchievementsResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  return getAchievementsView(session.user.id);
});

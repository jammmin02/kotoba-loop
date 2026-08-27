import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { getDailyQuestsView } from "@/lib/quest/service";
import type { DailyQuestsResponse } from "@/types/quest";

export const GET = withApiHandler(async (): Promise<DailyQuestsResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const quests = await getDailyQuestsView(session.user.id, new Date());
  return { quests };
});

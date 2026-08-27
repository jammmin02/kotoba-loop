import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { UserProfileResponse } from "@/types/user";

export const GET = withApiHandler(async (): Promise<UserProfileResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });

  return {
    nickname: user.nickname,
    email: user.email,
    createdAt: user.created_at.toISOString(),
    jlptLevel: user.jlpt_level,
    targetJlpt: user.target_jlpt,
    dailyWordTarget: user.daily_word_target,
    dailyStudyTime: user.daily_study_time,
    purpose: user.purpose,
  };
});

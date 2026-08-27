import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { onboardingSchema } from "@/lib/validations/onboarding";

import type { NextRequest } from "next/server";

interface OnboardingData {
  jlptLevel: string | null;
  targetJlpt: string | null;
  dailyWordTarget: number | null;
  dailyStudyTime: number | null;
  purpose: string[];
}

export const PATCH = withApiHandler(async (req: NextRequest): Promise<OnboardingData> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const body = await req.json();
  const { jlptLevel, targetJlpt, dailyWordTarget, dailyStudyTime, purpose } =
    onboardingSchema.parse(body);

  const user = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(jlptLevel !== undefined && { jlpt_level: jlptLevel }),
      ...(targetJlpt !== undefined && { target_jlpt: targetJlpt }),
      ...(dailyWordTarget !== undefined && { daily_word_target: dailyWordTarget }),
      ...(dailyStudyTime !== undefined && { daily_study_time: dailyStudyTime }),
      ...(purpose !== undefined && { purpose }),
    },
  });

  return {
    jlptLevel: user.jlpt_level,
    targetJlpt: user.target_jlpt,
    dailyWordTarget: user.daily_word_target,
    dailyStudyTime: user.daily_study_time,
    purpose: user.purpose,
  };
});

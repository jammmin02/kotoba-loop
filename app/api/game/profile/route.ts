import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { startOfKstDay } from "@/lib/datetime";
import { db } from "@/lib/db";
import { requiredExpForLevel } from "@/lib/game/engine";
import { getDisplayStreak } from "@/lib/game/streak";
import type { GameProfileResponse } from "@/types/game";

export const GET = withApiHandler(async (): Promise<GameProfileResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  // 고정 기본값 생성이라 충돌 여지가 없다 — grantExp(lib/game/grant.ts)처럼 트랜잭션/락이
  // 필요 없다.
  const profile = await db.userGameProfile.upsert({
    where: { user_id: session.user.id },
    update: {},
    create: { user_id: session.user.id },
  });

  const today = startOfKstDay();

  // 1회성 안내 플래그(PROMPT 27.5) — 이번 응답에 실어 보낸 뒤 즉시 false로 되돌려, 다음
  // 조회부터는 다시 뜨지 않게 한다.
  if (profile.streak_freeze_notice_pending) {
    await db.userGameProfile.update({
      where: { user_id: session.user.id },
      data: { streak_freeze_notice_pending: false },
    });
  }

  return {
    level: profile.level,
    exp: profile.exp,
    requiredExp: requiredExpForLevel(profile.level),
    currentStreak: getDisplayStreak(profile.current_streak, profile.last_studied_date, today),
    longestStreak: profile.longest_streak,
    studiedToday:
      !!profile.last_studied_date && profile.last_studied_date.getTime() === today.getTime(),
    streakFreezeCount: profile.streak_freeze_count,
    streakFreezeJustConsumed: profile.streak_freeze_notice_pending,
  };
});

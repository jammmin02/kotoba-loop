import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { followUserSchema } from "@/lib/validations/friend";
import type { FriendSummary } from "@/types/friend";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(async (): Promise<FriendSummary[]> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const following = await db.friend.findMany({
    where: { follower_id: session.user.id },
    orderBy: { created_at: "desc" },
    include: {
      followee: {
        select: {
          id: true,
          nickname: true,
          email: true,
          _count: { select: { vocabularyBooks: { where: { is_public: true } } } },
        },
      },
    },
  });

  return following.map((f) => ({
    userId: f.followee.id,
    nickname: f.followee.nickname,
    email: f.followee.email,
    publicBookCount: f.followee._count.vocabularyBooks,
    followedAt: formatKstISOString(f.created_at),
  }));
});

export const POST = withApiHandler(async (req: NextRequest): Promise<{ followeeId: string }> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const body = await req.json();
  const { followeeId } = followUserSchema.parse(body);

  if (followeeId === session.user.id) {
    throw new ApiError("VALIDATION_ERROR", "자기 자신은 팔로우할 수 없습니다.");
  }

  const followee = await db.user.findUnique({ where: { id: followeeId } });
  if (!followee) {
    throw new ApiError("NOT_FOUND", "사용자를 찾을 수 없습니다.");
  }

  await db.friend.upsert({
    where: { follower_id_followee_id: { follower_id: session.user.id, followee_id: followeeId } },
    create: { follower_id: session.user.id, followee_id: followeeId },
    update: {},
  });

  return { followeeId };
});

import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { escapeLikePattern, normalizeSearchQuery } from "@/lib/search";
import { userSearchQuerySchema } from "@/lib/validations/friend";
import type { UserSearchResult } from "@/types/friend";

import type { NextRequest } from "next/server";

const USER_SEARCH_LIMIT = 20;

export const GET = withApiHandler(async (req: NextRequest): Promise<UserSearchResult[]> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { q } = userSearchQuerySchema.parse({
    q: req.nextUrl.searchParams.get("q") ?? undefined,
  });

  const pattern = escapeLikePattern(normalizeSearchQuery(q));

  const users = await db.user.findMany({
    where: {
      id: { not: session.user.id },
      nickname: { contains: pattern, mode: "insensitive" },
    },
    orderBy: { nickname: "asc" },
    take: USER_SEARCH_LIMIT,
    select: {
      id: true,
      nickname: true,
      email: true,
      followedBy: { where: { follower_id: session.user.id }, select: { follower_id: true } },
    },
  });

  return users.map((user) => ({
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    isFollowing: user.followedBy.length > 0,
  }));
});

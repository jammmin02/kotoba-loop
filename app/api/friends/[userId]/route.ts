import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

import type { NextRequest } from "next/server";

export const DELETE = withApiHandler(
  async (_req: NextRequest, ctx: RouteContext<"/api/friends/[userId]">): Promise<{ userId: string }> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { userId } = await ctx.params;

    await db.friend.deleteMany({
      where: { follower_id: session.user.id, followee_id: userId },
    });

    return { userId };
  },
);

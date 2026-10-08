import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { loadConversationDetail } from "@/lib/conversation/session";
import type { ConversationSessionDetail } from "@/types/conversation";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/conversation/sessions/[id]">,
  ): Promise<ConversationSessionDetail> => {
    const session = await auth();
    if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    const { id } = await ctx.params;
    return loadConversationDetail(id, session.user.id);
  },
);

import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import type { AdminMemberDetail } from "@/types/admin";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/admin/members/[id]">,
  ): Promise<AdminMemberDetail> => {
    await requireAdmin();
    const { id } = await ctx.params;

    const user = await db.user.findUnique({
      where: { id },
      include: { _count: { select: { vocabularyBooks: true } } },
    });
    if (!user) throw new ApiError("NOT_FOUND", "회원을 찾을 수 없습니다.");

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      status: user.status,
      role: user.role,
      signupMethod: user.password_hash ? "EMAIL" : "GOOGLE",
      createdAt: user.created_at.toISOString(),
      lastActiveAt: user.last_active_at?.toISOString() ?? null,
      jlptLevel: user.jlpt_level,
      targetJlpt: user.target_jlpt,
      dailyWordTarget: user.daily_word_target,
      purpose: user.purpose,
      vocabularyBookCount: user._count.vocabularyBooks,
      reviewedAt: user.reviewed_at?.toISOString() ?? null,
      reviewedBy: user.reviewed_by,
      rejectReason: user.reject_reason,
    };
  },
);

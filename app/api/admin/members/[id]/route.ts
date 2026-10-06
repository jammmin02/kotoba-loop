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

    const books = await db.vocabularyBook.findMany({
      where: { user_id: id },
      select: { id: true, name: true },
    });
    const bookNameById = new Map(books.map((b) => [b.id, b.name]));

    const [reports, sanctions] = await Promise.all([
      db.report.findMany({
        where: { target_type: "BOOK", target_id: { in: books.map((b) => b.id) } },
        orderBy: { created_at: "desc" },
        take: 10,
      }),
      db.adminAuditLog.findMany({
        where: {
          target_user_id: id,
          action: { in: ["WARN", "RESTRICT_WRITE", "SUSPEND", "RESTORE"] },
        },
        orderBy: { created_at: "desc" },
        take: 10,
      }),
    ]);

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
      warningCount: user.warning_count,
      writeRestrictedUntil: user.write_restricted_until?.toISOString() ?? null,
      relatedReports: reports.map((r) => ({
        id: r.id,
        targetLabel: bookNameById.get(r.target_id) ?? "(삭제된 단어장)",
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at.toISOString(),
      })),
      sanctionHistory: sanctions.map((l) => ({
        id: l.id,
        action: l.action,
        reason: l.reason,
        createdAt: l.created_at.toISOString(),
      })),
    };
  },
);

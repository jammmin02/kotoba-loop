import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { ADMIN_PAGE_SIZE, adminReportsQuerySchema } from "@/lib/validations/admin";
import type { AdminReportGroup, AdminReportList, ReportReason } from "@/types/admin";

import type { NextRequest } from "next/server";

const MAX_DETAILS = 5;

/**
 * 신고를 대상 단위로 묶어 신고 건수가 많은 순으로 내려준다. 그룹 수는 상태·대상 종류로 이미 걸러져
 * 많지 않아 그룹 목록을 한 번에 읽어 정렬·페이지를 메모리에서 처리한다.
 */
export const GET = withApiHandler(async (req: NextRequest): Promise<AdminReportList> => {
  await requireAdmin();
  const { status, targetType, page } = adminReportsQuerySchema.parse(
    Object.fromEntries(req.nextUrl.searchParams),
  );

  const grouped = await db.report.groupBy({
    by: ["target_type", "target_id"],
    where: { status, ...(targetType && { target_type: targetType }) },
    _count: { _all: true },
    _max: { created_at: true },
  });

  grouped.sort(
    (a, b) =>
      b._count._all - a._count._all ||
      (b._max.created_at?.getTime() ?? 0) - (a._max.created_at?.getTime() ?? 0),
  );

  const pageGroups = grouped.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const targetIds = pageGroups.map((g) => g.target_id);

  const [reports, books] = await Promise.all([
    db.report.findMany({
      where: { status, target_id: { in: targetIds } },
      orderBy: { created_at: "desc" },
    }),
    db.vocabularyBook.findMany({
      where: { id: { in: targetIds } },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            email: true,
            status: true,
            warning_count: true,
            write_restricted_until: true,
          },
        },
        _count: { select: { items: true } },
      },
    }),
  ]);

  const bookById = new Map(books.map((b) => [b.id, b]));

  const groups: AdminReportGroup[] = pageGroups.map((g) => {
    const rows = reports.filter((r) => r.target_id === g.target_id);
    const reasonCounts = new Map<ReportReason, number>();
    for (const r of rows) reasonCounts.set(r.reason, (reasonCounts.get(r.reason) ?? 0) + 1);

    const book = bookById.get(g.target_id);
    const handled = rows.find((r) => r.handled_at);

    return {
      targetType: g.target_type,
      targetId: g.target_id,
      status,
      reportCount: g._count._all,
      lastReportedAt: (g._max.created_at ?? new Date(0)).toISOString(),
      reasons: [...reasonCounts].map(([reason, count]) => ({ reason, count })),
      details: rows
        .map((r) => r.detail)
        .filter((d): d is string => !!d)
        .slice(0, MAX_DETAILS),
      handledAt: handled?.handled_at?.toISOString() ?? null,
      resolutionNote: handled?.resolution_note ?? null,
      target: book
        ? {
            title: book.name,
            description: book.description,
            wordCount: book._count.items,
            hidden: book.hidden_at !== null,
            hideReason: book.hide_reason,
            owner: {
              id: book.user.id,
              nickname: book.user.nickname,
              email: book.user.email,
              status: book.user.status,
              warningCount: book.user.warning_count,
              writeRestrictedUntil: book.user.write_restricted_until?.toISOString() ?? null,
            },
          }
        : null,
    };
  });

  return { groups, total: grouped.length, page, pageSize: ADMIN_PAGE_SIZE };
});

import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { ADMIN_PAGE_SIZE, adminContentQuerySchema } from "@/lib/validations/admin";
import type { AdminContentList } from "@/types/admin";

import type { NextRequest } from "next/server";

/** 모더레이션 대상은 공개 단어장이다. 숨김 처리된 것은 비공개로 바뀌어도 복구할 수 있게 계속 보여준다. */
export const GET = withApiHandler(async (req: NextRequest): Promise<AdminContentList> => {
  await requireAdmin();
  const { filter, q, page } = adminContentQuerySchema.parse(
    Object.fromEntries(req.nextUrl.searchParams),
  );

  const and: Prisma.VocabularyBookWhereInput[] = [
    { OR: [{ is_public: true }, { hidden_at: { not: null } }] },
  ];
  if (filter === "hidden") and.push({ hidden_at: { not: null } });
  if (filter === "visible") and.push({ hidden_at: null });
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { user: { nickname: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  const where: Prisma.VocabularyBookWhereInput = { AND: and };

  const [books, total] = await Promise.all([
    db.vocabularyBook.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: {
        user: { select: { id: true, nickname: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    db.vocabularyBook.count({ where }),
  ]);

  const openReports = await db.report.groupBy({
    by: ["target_id"],
    where: { status: "OPEN", target_id: { in: books.map((b) => b.id) } },
    _count: { _all: true },
  });
  const openCountById = new Map(openReports.map((r) => [r.target_id, r._count._all]));

  return {
    books: books.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      isPublic: b.is_public,
      wordCount: b._count.items,
      importCount: b.import_count,
      hidden: b.hidden_at !== null,
      hideReason: b.hide_reason,
      openReportCount: openCountById.get(b.id) ?? 0,
      owner: b.user,
      createdAt: b.created_at.toISOString(),
    })),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
});

import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { communityBookQuerySchema } from "@/lib/validations/community";
import type { PaginatedResponse } from "@/types/api";
import type { CommunityBookSummary } from "@/types/community";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(
  async (req: NextRequest): Promise<PaginatedResponse<CommunityBookSummary>> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { sort, userId, page, pageSize } = communityBookQuerySchema.parse({
      sort: req.nextUrl.searchParams.get("sort") ?? undefined,
      userId: req.nextUrl.searchParams.get("userId") ?? undefined,
      page: req.nextUrl.searchParams.get("page") ?? undefined,
      pageSize: req.nextUrl.searchParams.get("pageSize") ?? undefined,
    });

    const where = {
      is_public: true,
      ...(userId !== undefined && { user_id: userId }),
    };

    const [total, books] = await Promise.all([
      db.vocabularyBook.count({ where }),
      db.vocabularyBook.findMany({
        where,
        orderBy:
          sort === "popular" ? [{ import_count: "desc" as const }, { created_at: "desc" as const }] : [{ created_at: "desc" as const }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { nickname: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    const items: CommunityBookSummary[] = books.map((book) => ({
      id: book.id,
      name: book.name,
      description: book.description,
      ownerNickname: book.user.nickname,
      wordCount: book._count.items,
      importCount: book.import_count,
      createdAt: formatKstISOString(book.created_at),
    }));

    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  },
);

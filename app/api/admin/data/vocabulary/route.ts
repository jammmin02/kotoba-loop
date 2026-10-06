import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { ADMIN_PAGE_SIZE } from "@/lib/validations/admin";
import { adminDataQuerySchema } from "@/lib/validations/admin-data";
import type { AdminDataList, AdminVocabularyRow } from "@/types/admin";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(
  async (req: NextRequest): Promise<AdminDataList<AdminVocabularyRow>> => {
    await requireAdmin();
    const { q, page } = adminDataQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const where: Prisma.VocabularyWhereInput = q
      ? {
          OR: [
            { word: { contains: q, mode: "insensitive" } },
            { reading: { contains: q, mode: "insensitive" } },
            { meanings: { some: { meaning: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      db.vocabulary.findMany({
        where,
        orderBy: [{ word: "asc" }, { id: "asc" }],
        skip: (page - 1) * ADMIN_PAGE_SIZE,
        take: ADMIN_PAGE_SIZE,
        include: { meanings: { orderBy: { id: "asc" }, select: { meaning: true } } },
      }),
      db.vocabulary.count({ where }),
    ]);

    return {
      rows: rows.map((v) => ({
        id: v.id,
        word: v.word,
        reading: v.reading,
        partOfSpeech: v.part_of_speech,
        jlptLevel: v.jlpt_level,
        meanings: v.meanings.map((m) => m.meaning),
      })),
      total,
      page,
      pageSize: ADMIN_PAGE_SIZE,
    };
  },
);

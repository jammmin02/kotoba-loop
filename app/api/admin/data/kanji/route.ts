import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { ADMIN_PAGE_SIZE } from "@/lib/validations/admin";
import { adminDataQuerySchema } from "@/lib/validations/admin-data";
import type { AdminDataList, AdminKanjiRow } from "@/types/admin";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(
  async (req: NextRequest): Promise<AdminDataList<AdminKanjiRow>> => {
    await requireAdmin();
    const { q, page } = adminDataQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const where: Prisma.KanjiWhereInput = q
      ? {
          OR: [
            { character: { contains: q } },
            { meaning: { contains: q, mode: "insensitive" } },
            { korean_reading: { contains: q, mode: "insensitive" } },
            { onyomi: { has: q } },
            { kunyomi: { has: q } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      db.kanji.findMany({
        where,
        orderBy: [{ stroke_count: "asc" }, { character: "asc" }],
        skip: (page - 1) * ADMIN_PAGE_SIZE,
        take: ADMIN_PAGE_SIZE,
      }),
      db.kanji.count({ where }),
    ]);

    return {
      rows: rows.map((k) => ({
        id: k.id,
        character: k.character,
        onyomi: k.onyomi,
        kunyomi: k.kunyomi,
        koreanReading: k.korean_reading,
        meaning: k.meaning,
        strokeCount: k.stroke_count,
        radical: k.radical,
        schoolGrade: k.school_grade,
        jlptLevelRef: k.jlpt_level_ref,
      })),
      total,
      page,
      pageSize: ADMIN_PAGE_SIZE,
    };
  },
);

import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeSearchQuery } from "@/lib/search";
import { kanjiListQuerySchema } from "@/lib/validations/kanji";
import type { PaginatedResponse } from "@/types/api";
import type { KanjiSummary } from "@/types/kanji";

import type { NextRequest } from "next/server";

type KanjiSearchRow = {
  character: string;
  onyomi: string[];
  kunyomi: string[];
  korean_reading: string;
  meaning: string;
  school_grade: number | null;
  jlpt_level_ref: KanjiSummary["jlptLevelRef"];
};

/** 훈독의 오쿠리가나 구분점(예: "み.える")을 제거해 "みえる"로도 검색되게 한다. */
function matchesQuery(kanji: KanjiSearchRow, normalizedQuery: string): boolean {
  const query = normalizedQuery.toLowerCase();
  return (
    kanji.character === normalizedQuery ||
    kanji.korean_reading.includes(normalizedQuery) ||
    kanji.meaning.toLowerCase().includes(query) ||
    kanji.onyomi.some((reading) => reading.includes(normalizedQuery)) ||
    kanji.kunyomi.some((reading) => reading.replace(/\./g, "").includes(normalizedQuery))
  );
}

/** 常用漢字 2,136자는 이 프로젝트 전체에서 고정 데이터라(PROMPT 33) 매 요청마다 전량을 훑어
 *  메모리에서 필터링해도 부담이 없다 — Postgres에 훈독/음독 배열의 부분 일치 조건을 태우는
 *  것보다 단순하고 이 데이터 규모에서 성능 차이도 없다. */
export const GET = withApiHandler(
  async (req: NextRequest): Promise<PaginatedResponse<KanjiSummary>> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { q, grade, jlpt, page, pageSize } = kanjiListQuerySchema.parse({
      q: req.nextUrl.searchParams.get("q") ?? undefined,
      grade: req.nextUrl.searchParams.get("grade") ?? undefined,
      jlpt: req.nextUrl.searchParams.get("jlpt") ?? undefined,
      page: req.nextUrl.searchParams.get("page") ?? undefined,
      pageSize: req.nextUrl.searchParams.get("pageSize") ?? undefined,
    });

    const rows = await db.kanji.findMany({
      where: {
        ...(grade !== undefined && { school_grade: grade }),
        ...(jlpt !== undefined && { jlpt_level_ref: jlpt }),
      },
      orderBy: [{ school_grade: "asc" }, { stroke_count: "asc" }, { character: "asc" }],
      select: {
        character: true,
        onyomi: true,
        kunyomi: true,
        korean_reading: true,
        meaning: true,
        school_grade: true,
        jlpt_level_ref: true,
      },
    });

    const normalizedQuery = q ? normalizeSearchQuery(q) : "";
    const filtered = normalizedQuery
      ? rows.filter((row) => matchesQuery(row, normalizedQuery))
      : rows;

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items: KanjiSummary[] = filtered.slice(start, start + pageSize).map((row) => ({
      character: row.character,
      koreanReading: row.korean_reading,
      meaning: row.meaning,
      schoolGrade: row.school_grade,
      jlptLevelRef: row.jlpt_level_ref,
    }));

    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  },
);

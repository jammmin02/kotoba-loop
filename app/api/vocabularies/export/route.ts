import { z } from "zod";

import { ApiError } from "@/lib/api/error";
import { apiError } from "@/lib/api/response";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { buildExportCsv, buildExportJson, exportFileName } from "@/lib/vocabulary-io/export";
import { loadExportData } from "@/lib/vocabulary-io/export-query";

import type { NextRequest } from "next/server";

const querySchema = z.object({
  format: z.enum(["json", "csv"]),
  /** 지정하면 그 단어장의 단어만, 없으면 내 모든 단어를 내보낸다. */
  bookId: z.string().min(1).optional(),
});

/**
 * 내 단어 내보내기(JSON: 학습 기록 포함 전체 백업 / CSV: 스프레드시트용 단순 표). 파일이라
 * `withApiHandler`를 쓰지 않고 오류만 같은 형식으로 변환한다.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");

    const { format, bookId } = querySchema.parse({
      format: req.nextUrl.searchParams.get("format") ?? undefined,
      bookId: req.nextUrl.searchParams.get("bookId") ?? undefined,
    });

    const { words, books } = await loadExportData(db, session.user.id, bookId);
    const body =
      format === "csv"
        ? buildExportCsv(words)
        : buildExportJson({ words, books, exportedAt: formatKstISOString(new Date()) });

    return new Response(body, {
      headers: {
        "Content-Type":
          format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFileName(bookId ? "book" : "all", format, new Date())}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.code, err.message, err.status);
    if (err instanceof z.ZodError) {
      return apiError("VALIDATION_ERROR", "내보내기 형식을 선택해주세요.", 400);
    }
    logger.error("vocabularies-export", "단어 내보내기 실패", err);
    return apiError("INTERNAL_ERROR", "예상치 못한 오류가 발생했습니다.", 500);
  }
}

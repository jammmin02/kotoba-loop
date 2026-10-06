import { OCR_WORD_EXTRACTION_TYPE } from "@/lib/ai/ocr-word-extraction";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { ADMIN_PAGE_SIZE, adminAiAnalysesQuerySchema } from "@/lib/validations/admin";
import type { AdminAiAnalysisList } from "@/types/admin";

import type { NextRequest } from "next/server";

const PREVIEW_LENGTH = 300;

/**
 * 사용자별로 저장된 AI 생성 결과 목록. OCR 일괄 분석 작업 행은 진행 상태를 담은 내부 데이터라 결과
 * 점검·차단 대상에서 뺀다.
 */
export const GET = withApiHandler(async (req: NextRequest): Promise<AdminAiAnalysisList> => {
  await requireAdmin();
  const { q, type, page } = adminAiAnalysesQuerySchema.parse(
    Object.fromEntries(req.nextUrl.searchParams),
  );

  const where: Prisma.AIAnalysisWhereInput = {
    analysis_type: type ? type : { not: OCR_WORD_EXTRACTION_TYPE },
    ...(type === OCR_WORD_EXTRACTION_TYPE && { id: "" }),
    ...(q && {
      OR: [
        { input_ref: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { nickname: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };

  const [rows, total, types] = await Promise.all([
    db.aIAnalysis.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { user: { select: { nickname: true, email: true } } },
    }),
    db.aIAnalysis.count({ where }),
    db.aIAnalysis.groupBy({
      by: ["analysis_type"],
      where: { analysis_type: { not: OCR_WORD_EXTRACTION_TYPE } },
      orderBy: { analysis_type: "asc" },
    }),
  ]);

  return {
    rows: rows.map((r) => {
      const json = JSON.stringify(r.result_json);
      return {
        id: r.id,
        analysisType: r.analysis_type,
        inputRef: r.input_ref,
        status: r.status,
        createdAt: r.created_at.toISOString(),
        user: { nickname: r.user.nickname, email: r.user.email },
        preview: json.length > PREVIEW_LENGTH ? `${json.slice(0, PREVIEW_LENGTH)}…` : json,
      };
    }),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    types: types.map((t) => t.analysis_type),
  };
});

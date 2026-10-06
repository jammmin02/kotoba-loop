import { OCR_WORD_EXTRACTION_TYPE } from "@/lib/ai/ocr-word-extraction";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { adminAiBlockSchema } from "@/lib/validations/admin";

import type { NextRequest } from "next/server";

/**
 * 문제가 있는 AI 생성 결과를 차단한다. 결과는 사용자별 캐시(AIAnalysis)라 행을 지우면 같은 요청이 다음에
 * 들어왔을 때 AI를 다시 호출해 새 결과를 만든다(kanji-mnemonic의 "다시 생성"과 같은 방식). 지우기 전에
 * 유형·입력·사용자는 감사 로그에 남긴다.
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<{ ok: true }> => {
  const admin = await requireAdmin();
  const { id, reason } = adminAiBlockSchema.parse(await req.json());

  await db.$transaction(async (tx) => {
    const row = await tx.aIAnalysis.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!row) throw new ApiError("NOT_FOUND", "이미 삭제되었거나 존재하지 않는 결과입니다.");
    if (row.analysis_type === OCR_WORD_EXTRACTION_TYPE) {
      throw new ApiError("VALIDATION_ERROR", "OCR 작업 데이터는 차단할 수 없습니다.");
    }

    await tx.aIAnalysis.delete({ where: { id } });
    await tx.adminAuditLog.create({
      data: {
        admin_id: admin.id,
        target_user_id: row.user.id,
        target_user_email: row.user.email,
        action: "BLOCK_AI_RESULT",
        target_id: row.id,
        target_label: `${row.analysis_type}: ${row.input_ref}`.slice(0, 200),
        reason: reason ?? null,
      },
    });
  });

  return { ok: true };
});

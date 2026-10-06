import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { createReportSchema } from "@/lib/validations/moderation";

import type { NextRequest } from "next/server";

/**
 * 공개 단어장 신고. 본인 단어장·비공개(또는 존재하지 않는) 단어장은 신고할 수 없고, 같은 대상을 두 번
 * 신고할 수 없다(DB unique). 비공개 단어장은 존재 여부를 숨기려고 없는 것과 같은 404로 응답한다.
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<{ id: string }> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { targetType, targetId, reason, detail } = createReportSchema.parse(await req.json());

  const book = await db.vocabularyBook.findUnique({
    where: { id: targetId },
    select: { user_id: true, is_public: true },
  });
  if (!book || (!book.is_public && book.user_id !== session.user.id)) {
    throw new ApiError("NOT_FOUND", "단어장을 찾을 수 없습니다.");
  }
  if (book.user_id === session.user.id) {
    throw new ApiError("VALIDATION_ERROR", "내 단어장은 신고할 수 없습니다.");
  }

  try {
    const report = await db.report.create({
      data: {
        reporter_id: session.user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        detail: detail ?? null,
      },
      select: { id: true },
    });
    return report;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ApiError("CONFLICT", "이미 신고한 단어장입니다.");
    }
    throw err;
  }
});

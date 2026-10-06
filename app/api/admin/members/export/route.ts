import { toCsv } from "@/lib/admin/csv";
import { ApiError } from "@/lib/api/error";
import { apiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { adminMembersQuerySchema } from "@/lib/validations/admin";

import type { NextRequest } from "next/server";

const STATUS_LABELS = {
  PENDING: "승인 대기",
  APPROVED: "승인",
  REJECTED: "거절",
  SUSPENDED: "정지",
} as const;

// 한 번에 내보낼 수 있는 최대 인원. 넘으면 잘리지 않고 오류로 알려, 일부만 받은 줄 모르는 일을 막는다.
const MAX_EXPORT_ROWS = 5000;

function formatDate(date: Date | null): string {
  return date ? date.toISOString() : "";
}

/**
 * 회원 목록 CSV. 개인정보를 최소화해 이메일·닉네임·상태·가입 방식·가입일·마지막 활동만 담는다.
 * 데이터를 내보내기 전에 감사 로그를 먼저 남긴다 — 기록에 실패하면 내보내지 않는다.
 * JSON 응답이 아니라 파일이라 withApiHandler를 쓰지 않고 오류를 직접 같은 형식으로 변환한다.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { status, q } = adminMembersQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const where: Prisma.UserWhereInput = {
      role: "USER",
      ...(status === "DELETED" ? { deleted_at: { not: null } } : { status, deleted_at: null }),
      ...(q && {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { nickname: { contains: q, mode: "insensitive" } },
        ],
      }),
    };

    const total = await db.user.count({ where });
    if (total > MAX_EXPORT_ROWS) {
      throw new ApiError(
        "VALIDATION_ERROR",
        `내보낼 인원이 너무 많습니다(${total}명). 검색 조건으로 ${MAX_EXPORT_ROWS}명 이하로 줄여주세요.`,
      );
    }

    const users = await db.user.findMany({
      where,
      orderBy: { created_at: "desc" },
      select: {
        email: true,
        nickname: true,
        status: true,
        password_hash: true,
        created_at: true,
        last_active_at: true,
        deleted_at: true,
      },
    });

    await db.adminAuditLog.create({
      data: {
        admin_id: admin.id,
        target_user_email: "(시스템)",
        action: "EXPORT_MEMBERS",
        reason: `${users.length}명 (탭: ${status}${q ? `, 검색: ${q}` : ""})`,
      },
    });

    const csv = toCsv(
      ["이메일", "닉네임", "상태", "가입 방식", "가입일", "마지막 활동", "삭제일"],
      users.map((u) => [
        u.email,
        u.nickname,
        STATUS_LABELS[u.status],
        u.password_hash ? "이메일" : "Google",
        formatDate(u.created_at),
        formatDate(u.last_active_at),
        formatDate(u.deleted_at),
      ]),
    );

    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="members-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.code, err.message, err.status);
    if (err instanceof Error && err.name === "ZodError") {
      return apiError("VALIDATION_ERROR", "잘못된 요청입니다.", 400);
    }
    console.error(err);
    return apiError("INTERNAL_ERROR", "예상치 못한 오류가 발생했습니다.", 500);
  }
}

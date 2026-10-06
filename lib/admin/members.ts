import "server-only";

import { db } from "@/lib/db";
import type { AdminAuditAction, UserStatus } from "@/lib/generated/prisma/client";

/** 액션별로 허용되는 현재 상태와 결과 상태. REJECTED는 재신청 불가라 되돌리는 액션이 없다. */
const TRANSITIONS: Record<AdminAuditAction, { from: UserStatus; to: UserStatus }> = {
  APPROVE: { from: "PENDING", to: "APPROVED" },
  REJECT: { from: "PENDING", to: "REJECTED" },
  SUSPEND: { from: "APPROVED", to: "SUSPENDED" },
  RESTORE: { from: "SUSPENDED", to: "APPROVED" },
};

/**
 * 회원 상태를 바꾸고 감사 로그를 남긴다 — 둘은 한 트랜잭션이다. 현재 상태가 맞지 않는 대상(이미 처리됨),
 * 본인, 다른 관리자는 조용히 건너뛰고 `skipped`로 센다(일괄 처리 중 일부가 동시에 처리된 경우 대비).
 */
export async function reviewMembers(params: {
  adminId: string;
  userIds: string[];
  action: AdminAuditAction;
  reason?: string;
}): Promise<{ updated: number; skipped: number }> {
  const { adminId, userIds, action, reason } = params;
  const { from, to } = TRANSITIONS[action];
  const uniqueIds = [...new Set(userIds)];

  return db.$transaction(async (tx) => {
    const targets = await tx.user.findMany({
      where: { id: { in: uniqueIds, not: adminId }, status: from, role: "USER" },
      select: { id: true, email: true },
    });

    if (targets.length > 0) {
      // 조건에 현재 상태를 다시 걸어 두 관리자가 동시에 같은 대상을 처리해도 이중 기록되지 않게 한다.
      const result = await tx.user.updateMany({
        where: { id: { in: targets.map((t) => t.id) }, status: from },
        data: {
          status: to,
          reviewed_at: new Date(),
          reviewed_by: adminId,
          reject_reason: action === "REJECT" ? (reason ?? null) : null,
        },
      });

      if (result.count !== targets.length) {
        throw new Error("회원 상태가 동시에 변경되었습니다. 다시 시도해주세요.");
      }

      await tx.adminAuditLog.createMany({
        data: targets.map((t) => ({
          admin_id: adminId,
          target_user_id: t.id,
          target_user_email: t.email,
          action,
          reason: reason ?? null,
        })),
      });
    }

    return { updated: targets.length, skipped: uniqueIds.length - targets.length };
  });
}

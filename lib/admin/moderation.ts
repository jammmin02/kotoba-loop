import "server-only";

import { ApiError } from "@/lib/api/error";
import { db } from "@/lib/db";
import type { AdminAuditAction, Prisma, ReportTargetType } from "@/lib/generated/prisma/client";
import type { AdminResolveReportInput, AdminSanctionInput } from "@/lib/validations/admin";

type Tx = Prisma.TransactionClient;

const DAY_MS = 24 * 60 * 60 * 1000;
const RESTRICT_DAYS = { RESTRICT_1D: 1, RESTRICT_7D: 7, RESTRICT_30D: 30 } as const;

interface AuditEntry {
  adminId: string;
  action: AdminAuditAction;
  targetUser: { id: string; email: string } | null;
  reason?: string;
  target?: { type: ReportTargetType; id: string; label: string };
}

async function writeAudit(tx: Tx, entry: AuditEntry) {
  await tx.adminAuditLog.create({
    data: {
      admin_id: entry.adminId,
      target_user_id: entry.targetUser?.id ?? null,
      target_user_email: entry.targetUser?.email ?? "(알 수 없음)",
      action: entry.action,
      reason: entry.reason ?? null,
      target_type: entry.target?.type ?? null,
      target_id: entry.target?.id ?? null,
      target_label: entry.target?.label ?? null,
    },
  });
}

/** 제재(경고·작성 제한) 대상이 될 수 있는 일반 회원인지 확인한다 — 본인과 다른 관리자는 제외. */
async function loadSanctionTarget(tx: Tx, adminId: string, userId: string) {
  if (userId === adminId) {
    throw new ApiError("VALIDATION_ERROR", "본인에게는 제재를 적용할 수 없습니다.");
  }
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, write_restricted_until: true },
  });
  if (!user) throw new ApiError("NOT_FOUND", "회원을 찾을 수 없습니다.");
  if (user.role === "ADMIN") {
    throw new ApiError("VALIDATION_ERROR", "관리자 계정에는 제재를 적용할 수 없습니다.");
  }
  return user;
}

type SanctionAction = AdminSanctionInput["action"];

/**
 * 경고 → 작성 제한(1/7/30일) 단계의 제재를 적용한다. 정지(SUSPENDED)는 회원 관리의 기존 흐름을 쓴다.
 * 작성 제한은 이미 더 긴 제한이 걸려 있으면 줄이지 않고 그대로 둔다(LIFT_RESTRICTION만 해제한다).
 */
async function applySanction(
  tx: Tx,
  params: { adminId: string; userId: string; action: SanctionAction; reason?: string },
) {
  const { adminId, userId, action, reason } = params;
  const user = await loadSanctionTarget(tx, adminId, userId);

  if (action === "WARN") {
    await tx.user.update({ where: { id: userId }, data: { warning_count: { increment: 1 } } });
    await writeAudit(tx, { adminId, action: "WARN", targetUser: user, reason });
    return;
  }

  if (action === "LIFT_RESTRICTION") {
    await tx.user.update({ where: { id: userId }, data: { write_restricted_until: null } });
    await writeAudit(tx, {
      adminId,
      action: "RESTRICT_WRITE",
      targetUser: user,
      reason: reason ? `작성 제한 해제: ${reason}` : "작성 제한 해제",
    });
    return;
  }

  const requested = new Date(Date.now() + RESTRICT_DAYS[action] * DAY_MS);
  const current = user.write_restricted_until;
  const until = current && current > requested ? current : requested;
  await tx.user.update({ where: { id: userId }, data: { write_restricted_until: until } });
  await writeAudit(tx, {
    adminId,
    action: "RESTRICT_WRITE",
    targetUser: user,
    reason: `${RESTRICT_DAYS[action]}일 작성 제한${reason ? `: ${reason}` : ""}`,
  });
}

export async function sanctionMember(params: {
  adminId: string;
  userId: string;
  action: SanctionAction;
  reason?: string;
}): Promise<void> {
  await db.$transaction((tx) => applySanction(tx, params));
}

async function loadBook(tx: Tx, bookId: string) {
  return tx.vocabularyBook.findUnique({
    where: { id: bookId },
    include: { user: { select: { id: true, email: true } } },
  });
}

async function hideBook(tx: Tx, adminId: string, bookId: string, reason?: string) {
  const book = await loadBook(tx, bookId);
  if (!book) throw new ApiError("NOT_FOUND", "단어장을 찾을 수 없습니다.");
  if (book.hidden_at) return book;
  await tx.vocabularyBook.update({
    where: { id: bookId },
    data: { hidden_at: new Date(), hidden_by: adminId, hide_reason: reason ?? null },
  });
  await writeAudit(tx, {
    adminId,
    action: "HIDE_CONTENT",
    targetUser: book.user,
    reason,
    target: { type: "BOOK", id: book.id, label: book.name },
  });
  return book;
}

async function restoreBook(tx: Tx, adminId: string, bookId: string, reason?: string) {
  const book = await loadBook(tx, bookId);
  if (!book) throw new ApiError("NOT_FOUND", "단어장을 찾을 수 없습니다.");
  if (!book.hidden_at) return;
  await tx.vocabularyBook.update({
    where: { id: bookId },
    data: { hidden_at: null, hidden_by: null, hide_reason: null },
  });
  await writeAudit(tx, {
    adminId,
    action: "RESTORE_CONTENT",
    targetUser: book.user,
    reason,
    target: { type: "BOOK", id: book.id, label: book.name },
  });
}

/**
 * 단어장을 삭제한다. 항목·배틀방은 FK cascade로 함께 지워지고, 이 단어장을 가져간 사용자의 복사본은
 * 별개 행이라 영향이 없다. 감사 로그에는 이름을 스냅샷으로 남긴다.
 */
async function deleteBook(tx: Tx, adminId: string, bookId: string, reason?: string) {
  const book = await loadBook(tx, bookId);
  if (!book) throw new ApiError("NOT_FOUND", "단어장을 찾을 수 없습니다.");
  await writeAudit(tx, {
    adminId,
    action: "DELETE_CONTENT",
    targetUser: book.user,
    reason,
    target: { type: "BOOK", id: book.id, label: book.name },
  });
  await tx.vocabularyBook.delete({ where: { id: bookId } });
}

export async function moderateBook(params: {
  adminId: string;
  bookId: string;
  action: "HIDE" | "RESTORE" | "DELETE";
  reason?: string;
}): Promise<void> {
  const { adminId, bookId, action, reason } = params;
  await db.$transaction(async (tx) => {
    if (action === "HIDE") await hideBook(tx, adminId, bookId, reason);
    else if (action === "RESTORE") await restoreBook(tx, adminId, bookId, reason);
    else await deleteBook(tx, adminId, bookId, reason);
  });
}

/**
 * 한 대상에 쌓인 OPEN 신고를 한 번에 처리한다. 콘텐츠 조치(숨김/삭제)와 작성자 제재(경고/작성 제한)는
 * 같은 트랜잭션에서 적용되고, 아무 조치도 고르지 않으면 "기각"이다. 대상이 이미 삭제돼 있으면 조치 없이
 * 신고만 기각으로 닫는다.
 */
export async function resolveReports(
  adminId: string,
  input: AdminResolveReportInput,
): Promise<{ closed: number }> {
  const { targetType, targetId, contentAction, userAction, note } = input;
  const dismiss = contentAction === "NONE" && userAction === "NONE";

  return db.$transaction(async (tx) => {
    const open = await tx.report.findMany({
      where: { target_type: targetType, target_id: targetId, status: "OPEN" },
      select: { id: true },
    });
    if (open.length === 0) {
      throw new ApiError("CONFLICT", "이미 처리되었거나 존재하지 않는 신고입니다.");
    }

    const book = await loadBook(tx, targetId);
    const targetGone = book === null;
    if (targetGone && !dismiss) {
      throw new ApiError("VALIDATION_ERROR", "이미 삭제된 단어장입니다. 신고를 기각해주세요.");
    }

    // 제재 대상 검증을 콘텐츠 조치보다 먼저 해서, 불가능한 조합이면 아무것도 바뀌지 않게 한다.
    if (userAction !== "NONE" && book) {
      await loadSanctionTarget(tx, adminId, book.user.id);
    }

    const label = book?.name ?? "(삭제된 단어장)";
    if (book) {
      if (contentAction === "HIDE") await hideBook(tx, adminId, targetId, note);
      if (contentAction === "DELETE") await deleteBook(tx, adminId, targetId, note);
      if (userAction !== "NONE") {
        await applySanction(tx, {
          adminId,
          userId: book.user.id,
          action: userAction,
          reason: note,
        });
      }
    }

    await tx.report.updateMany({
      where: { id: { in: open.map((r) => r.id) } },
      data: {
        status: dismiss ? "DISMISSED" : "RESOLVED",
        handled_by: adminId,
        handled_at: new Date(),
        resolution_note: note ?? (targetGone ? "대상이 이미 삭제됨" : null),
      },
    });

    await writeAudit(tx, {
      adminId,
      action: dismiss ? "DISMISS_REPORT" : "RESOLVE_REPORT",
      targetUser: book?.user ?? null,
      reason: note,
      target: { type: targetType, id: targetId, label },
    });

    return { closed: open.length };
  });
}

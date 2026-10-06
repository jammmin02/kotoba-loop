import "server-only";

import { redirect } from "next/navigation";

import { ApiError } from "@/lib/api/error";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-admin";
import { db } from "@/lib/db";

/**
 * Route Handler용 관리자 검사. 세션 role은 JWT에서 최대 1분 지연될 수 있으므로(lib/auth.ts의
 * SESSION_REFRESH_MS) 권한 박탈이 즉시 필요한 경우를 위해 DB 값을 한 번 더 확인한다.
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }
  if (!isAdminRole(session.user.role)) {
    throw new ApiError("FORBIDDEN", "관리자만 사용할 수 있는 기능입니다.");
  }
  const current = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, status: true, email: true },
  });
  if (!current || current.role !== "ADMIN" || current.status !== "APPROVED") {
    throw new ApiError("FORBIDDEN", "관리자만 사용할 수 있는 기능입니다.");
  }
  return { id: session.user.id, email: current.email };
}

/** Server Component 페이지용 관리자 검사 — 비로그인은 로그인으로, 비관리자는 홈으로 보낸다. */
export async function requireAdminPage(callbackUrl: string): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  if (!isAdminRole(session.user.role)) {
    redirect("/");
  }
  return { id: session.user.id };
}

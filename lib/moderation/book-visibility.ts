import { isAdminRole } from "@/lib/auth-admin";

export const HIDDEN_BOOK_NAME = "관리자에 의해 숨김 처리됨";

/** 숨김 처리된 단어장의 원문은 작성자 본인과 관리자만 볼 수 있다. */
export function canViewHiddenBook(
  viewer: { id: string; role?: string | null },
  ownerId: string,
): boolean {
  return viewer.id === ownerId || isAdminRole(viewer.role);
}

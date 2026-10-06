/**
 * 관리자 판별 — User.role === ADMIN 이 기준이다(2026-10 가입 승인제 도입 전에는 이메일 상수 비교였다).
 * 이 파일은 클라이언트 번들에도 들어가므로 서버 전용 코드를 두지 않는다. 서버에서의 실제 권한 검사는
 * `lib/auth-guard.ts`의 `requireAdmin()`을 쓴다.
 */
export const ADMIN_EMAIL = "admin@kotoba-loop.app";

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "ADMIN";
}

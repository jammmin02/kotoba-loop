/**
 * 관리자 판별 — 스키마에 별도 role/is_admin 컬럼이 없어(prisma/seed-admin-account.ts 참고)
 * 이메일 상수 비교로 판별한다. 서버(API route)와 클라이언트(펫 위젯의 관리자 전용 컨트롤 노출)
 * 양쪽에서 같은 값을 써야 하므로 여기 한 곳에만 정의한다 — 서버 전용 부작용이 없어 클라이언트
 * 번들에 포함돼도 안전하다(이메일 문자열 자체는 로그인 화면 안내 문구에도 이미 노출되는 값).
 */
export const ADMIN_EMAIL = "admin@kotoba-loop.app";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}

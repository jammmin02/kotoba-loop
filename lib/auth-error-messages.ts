/**
 * Maps NextAuth error identifiers to Korean messages. Credentials errors use
 * the custom `code` thrown from `lib/auth.ts`'s `authorize()`; OAuth errors
 * use the standard `error` type NextAuth redirects back with.
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  account_not_found: "존재하지 않는 계정입니다.",
  invalid_password: "비밀번호가 올바르지 않습니다.",
  google_only_account: "Google로 가입된 계정입니다. Google로 로그인해주세요.",
  credentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
  OAuthAccountNotLinked: "이미 다른 방법으로 가입된 이메일입니다.",
  AccessDenied: "Google 로그인이 취소되었습니다.",
  OAuthSignin: "Google 인증에 실패했습니다.",
  OAuthCallback: "Google 인증에 실패했습니다.",
  OAuthCallbackError: "Google 인증에 실패했습니다.",
  Configuration: "로그인 설정에 문제가 있습니다. 잠시 후 다시 시도해주세요.",
};

export function getAuthErrorMessage(code: string | null | undefined): string {
  if (!code) return "로그인에 실패했습니다.";
  return AUTH_ERROR_MESSAGES[code] ?? "로그인에 실패했습니다.";
}

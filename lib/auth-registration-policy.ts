import "server-only";

import { ADMIN_EMAIL } from "@/lib/auth-admin";
import { getAllowedEmailDomains } from "@/lib/settings";

/**
 * 가입 제한: 허용 이메일 도메인(관리자 설정, 기본 @g.yju.ac.kr)과 시드된 관리자 계정만 새 계정을
 * 만들 수 있다. 이메일 가입과 첫 Google 로그인 모두에 적용되며, 정책 밖의 기존 계정은 계속 로그인할 수
 * 있다. 도메인은 /admin/settings 에서 바꾼다(lib/settings.ts).
 */
export async function isRegistrationAllowed(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (normalized === ADMIN_EMAIL) return true;
  const domains = await getAllowedEmailDomains();
  return domains.some((domain) => normalized.endsWith(domain));
}

export function registrationRestrictedMessage(domains: string[]): string {
  return `현재는 ${domains.join(", ")} 이메일만 가입할 수 있습니다.`;
}

export const REGISTRATION_REJECTED_MESSAGE = "가입이 거절된 이메일입니다. 다시 신청할 수 없습니다.";
export const REGISTRATION_DELETED_MESSAGE = "사용할 수 없는 이메일입니다.";

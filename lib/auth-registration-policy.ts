import { ADMIN_EMAIL } from "@/lib/auth-admin";

/**
 * Temporary signup restriction (2026-09): only @g.yju.ac.kr email addresses and
 * the seeded admin account (prisma/seed-admin-account.ts) may create new
 * accounts. Applies to both credentials registration and first-time Google
 * sign-in — existing accounts outside this policy can still log in.
 */
const ALLOWED_EMAIL_DOMAIN = "@g.yju.ac.kr";

export const REGISTRATION_RESTRICTED_MESSAGE = `현재는 ${ALLOWED_EMAIL_DOMAIN} 이메일만 가입할 수 있습니다.`;

export function isRegistrationAllowed(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized === ADMIN_EMAIL || normalized.endsWith(ALLOWED_EMAIL_DOMAIN);
}

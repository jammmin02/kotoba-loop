import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { isRegistrationAllowed } from "@/lib/auth-registration-policy";
import { db } from "@/lib/db";

/**
 * Distinct `code` values so the client can map `signIn(...).code` (or the
 * `?code=` redirect param) to a Korean error message. See `@auth/core`'s
 * `CredentialsSignin` — the `code` survives unchanged from `authorize()`.
 */
export class AccountNotFoundError extends CredentialsSignin {
  code = "account_not_found";
}
export class InvalidPasswordError extends CredentialsSignin {
  code = "invalid_password";
}
export class GoogleOnlyAccountError extends CredentialsSignin {
  code = "google_only_account";
}
export class AccountPendingError extends CredentialsSignin {
  code = "account_pending";
}
export class AccountRejectedError extends CredentialsSignin {
  code = "account_rejected";
}
export class AccountSuspendedError extends CredentialsSignin {
  code = "account_suspended";
}
export class AccountDeletedError extends CredentialsSignin {
  code = "account_deleted";
}

// JWT에 실린 role/status가 DB와 어긋나 있어도 이 시간 안에는 다시 조회하지 않는다. 정지·거절은
// 최대 이 시간 안에 기존 세션에도 반영된다.
const SESSION_REFRESH_MS = 60_000;
// last_active_at 쓰기는 이 간격으로만 한다(요청마다 쓰지 않기 위해).
const LAST_ACTIVE_WRITE_MS = 10 * 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email;
        const password = credentials?.password;
        if (typeof rawEmail !== "string" || typeof password !== "string") {
          throw new AccountNotFoundError();
        }
        const email = rawEmail.trim().toLowerCase();

        const user = await db.user.findUnique({ where: { email } });
        if (!user) throw new AccountNotFoundError();
        if (!user.password_hash) throw new GoogleOnlyAccountError();

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) throw new InvalidPasswordError();

        // 비밀번호가 맞은 뒤에만 상태를 알려준다(상태를 알아내는 용도로 계정 존재를 탐색하지 못하게).
        if (user.deleted_at) throw new AccountDeletedError();
        if (user.status === "PENDING") throw new AccountPendingError();
        if (user.status === "REJECTED") throw new AccountRejectedError();
        if (user.status === "SUSPENDED") throw new AccountSuspendedError();

        return { id: user.id, email: user.email, name: user.nickname };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;
      const email = user.email.trim().toLowerCase();

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        // 문자열을 반환하면 Auth.js가 그 경로로 리다이렉트한다(로그인 세션은 만들어지지 않는다).
        if (existing.deleted_at) return "/login?error=account_deleted";
        if (existing.status === "PENDING") return "/pending";
        if (existing.status === "REJECTED") return "/login?error=account_rejected";
        if (existing.status === "SUSPENDED") return "/login?error=account_suspended";
        user.id = existing.id;
        user.email = existing.email;
        return true;
      }

      if (!(await isRegistrationAllowed(email))) return false;

      // 신규 Google 가입도 이메일 가입과 같이 관리자 승인 전까지는 로그인할 수 없다.
      await db.user.create({
        data: {
          email,
          nickname: user.name?.trim() || email.split("@")[0],
        },
      });
      return "/pending";
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.checkedAt = 0;
      }

      const now = Date.now();
      const checkedAt = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      if (typeof token.id === "string" && now - checkedAt > SESSION_REFRESH_MS) {
        const current = await db.user.findUnique({
          where: { id: token.id },
          select: { status: true, role: true, last_active_at: true, deleted_at: true },
        });
        // 계정이 사라졌거나 승인 상태가 아니면 세션을 무효화한다(null 반환 시 쿠키가 지워진다).
        if (!current || current.deleted_at || current.status !== "APPROVED") return null;

        token.role = current.role;
        token.checkedAt = now;

        if (
          !current.last_active_at ||
          now - current.last_active_at.getTime() > LAST_ACTIVE_WRITE_MS
        ) {
          await db.user.update({
            where: { id: token.id },
            data: { last_active_at: new Date(now) },
          });
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "USER";
      }
      return session;
    },
  },
});

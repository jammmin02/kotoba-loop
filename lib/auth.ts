import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

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
        user.id = existing.id;
        user.email = existing.email;
        return true;
      }

      const created = await db.user.create({
        data: {
          email,
          nickname: user.name?.trim() || email.split("@")[0],
        },
      });
      user.id = created.id;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

import type { DefaultSession } from "next-auth";

type UserRole = "USER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: UserRole;
    /** 마지막으로 DB의 role/status를 확인한 시각(ms) */
    checkedAt?: number;
  }
}

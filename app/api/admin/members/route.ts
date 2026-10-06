import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { ADMIN_PAGE_SIZE, adminMembersQuerySchema } from "@/lib/validations/admin";
import type { AdminMemberList } from "@/types/admin";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(async (req: NextRequest): Promise<AdminMemberList> => {
  await requireAdmin();

  const { status, q, page } = adminMembersQuerySchema.parse(
    Object.fromEntries(req.nextUrl.searchParams),
  );

  const where: Prisma.UserWhereInput = {
    role: "USER",
    status,
    ...(q && {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { nickname: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { created_at: status === "PENDING" ? "asc" : "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        email: true,
        nickname: true,
        status: true,
        role: true,
        password_hash: true,
        created_at: true,
        last_active_at: true,
      },
    }),
    db.user.count({ where }),
  ]);

  return {
    members: users.map((u) => ({
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      status: u.status,
      role: u.role,
      signupMethod: u.password_hash ? "EMAIL" : "GOOGLE",
      createdAt: u.created_at.toISOString(),
      lastActiveAt: u.last_active_at?.toISOString() ?? null,
    })),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
});

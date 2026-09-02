import bcrypt from "bcryptjs";

import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { isRegistrationAllowed, REGISTRATION_RESTRICTED_MESSAGE } from "@/lib/auth-registration-policy";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { registerSchema } from "@/lib/validations/auth";

import type { NextRequest } from "next/server";

const SALT_ROUNDS = 10;

interface RegisterData {
  id: string;
  email: string;
  nickname: string;
}

export const POST = withApiHandler(async (req: NextRequest): Promise<RegisterData> => {
  const body = await req.json();
  const { nickname, email, password } = registerSchema.parse(body);

  if (!isRegistrationAllowed(email)) {
    throw new ApiError("VALIDATION_ERROR", REGISTRATION_RESTRICTED_MESSAGE);
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError("VALIDATION_ERROR", "이미 사용 중인 이메일입니다.");
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await db.user.create({
      data: { email, nickname, password_hash },
    });
    return { id: user.id, email: user.email, nickname: user.nickname };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ApiError("VALIDATION_ERROR", "이미 사용 중인 이메일입니다.");
    }
    throw err;
  }
});

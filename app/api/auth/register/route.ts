import bcrypt from "bcryptjs";

import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import {
  isRegistrationAllowed,
  REGISTRATION_DELETED_MESSAGE,
  REGISTRATION_REJECTED_MESSAGE,
  registrationRestrictedMessage,
} from "@/lib/auth-registration-policy";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { getAllowedEmailDomains } from "@/lib/settings";
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

  if (!(await isRegistrationAllowed(email))) {
    throw new ApiError(
      "VALIDATION_ERROR",
      registrationRestrictedMessage(await getAllowedEmailDomains()),
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // 소프트 삭제된 계정의 이메일은 재가입할 수 없다(계정 행을 남겨 두는 이유).
    if (existing.deleted_at) {
      throw new ApiError("FORBIDDEN", REGISTRATION_DELETED_MESSAGE);
    }
    // 거절된 이메일은 재신청할 수 없다 — 계정 행을 남겨 두는 이유이기도 하다.
    if (existing.status === "REJECTED") {
      throw new ApiError("FORBIDDEN", REGISTRATION_REJECTED_MESSAGE);
    }
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

import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { createTagSchema } from "@/lib/validations/tag";
import type { TagSummary } from "@/types/tag";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(async (): Promise<TagSummary[]> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const tags = await db.tag.findMany({
    where: { user_id: session.user.id },
    orderBy: { name: "asc" },
  });

  return tags.map((tag) => ({ id: tag.id, name: tag.name }));
});

export const POST = withApiHandler(async (req: NextRequest): Promise<TagSummary> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const body = await req.json();
  const { name } = createTagSchema.parse(body);

  try {
    const tag = await db.tag.create({
      data: { user_id: session.user.id, name },
    });
    return { id: tag.id, name: tag.name };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ApiError("VALIDATION_ERROR", "이미 등록된 태그예요.");
    }
    throw err;
  }
});

export const DELETE = withApiHandler(async (req: NextRequest): Promise<{ id: string }> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    throw new ApiError("VALIDATION_ERROR", "삭제할 태그를 지정해주세요.");
  }

  const tag = await db.tag.findUnique({ where: { id } });
  if (!tag || tag.user_id !== session.user.id) {
    throw new ApiError("NOT_FOUND", "태그를 찾을 수 없습니다.");
  }

  // Cascades to VocabularyTag — safe since the tag is user-scoped and this
  // only unlinks it from words, never deletes the words themselves.
  await db.tag.delete({ where: { id } });

  return { id };
});

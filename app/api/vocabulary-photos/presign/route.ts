import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { createPhotoUploadTarget } from "@/lib/storage/photo-upload";
import { presignPhotoUploadSchema } from "@/lib/validations/photo-upload";
import type { PhotoUploadPresignResult } from "@/types/photo-upload";

import type { NextRequest } from "next/server";

export const POST = withApiHandler(async (req: NextRequest): Promise<PhotoUploadPresignResult> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const body = await req.json();
  const { mimeType } = presignPhotoUploadSchema.parse(body);

  return createPhotoUploadTarget(session.user.id, mimeType);
});

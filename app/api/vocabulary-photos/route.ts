import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { createPhotoPreviewUrl, verifyUploadedPhoto } from "@/lib/storage/photo-upload";
import { registerPhotoUploadSchema } from "@/lib/validations/photo-upload";
import type { PhotoUploadRecord } from "@/types/photo-upload";

import type { NextRequest } from "next/server";

/**
 * Registers a photo that has already been PUT to the presigned URL from
 * `/api/vocabulary-photos/presign`. This is the "임시 레코드 생성" step (PROMPT 28) —
 * it only ever creates `PhotoUpload(status=pending)`; OCR (PROMPT 29) consumes the queue.
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<PhotoUploadRecord> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const body = await req.json();
  const { storageKey, width, height } = registerPhotoUploadSchema.parse(body);

  const verified = await verifyUploadedPhoto(storageKey, session.user.id, { width, height });

  const photoUpload = await db.photoUpload.create({
    data: {
      user_id: session.user.id,
      storage_key: storageKey,
      mime_type: verified.mimeType,
      file_size: verified.fileSize,
      width: verified.width,
      height: verified.height,
    },
  });

  const previewUrl = await createPhotoPreviewUrl(storageKey);

  return {
    id: photoUpload.id,
    previewUrl,
    mimeType: photoUpload.mime_type,
    fileSize: photoUpload.file_size,
    width: photoUpload.width,
    height: photoUpload.height,
    status: "pending",
    createdAt: formatKstISOString(photoUpload.created_at),
  };
});

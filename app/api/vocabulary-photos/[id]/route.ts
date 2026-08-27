import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { createPhotoPreviewUrl } from "@/lib/storage/photo-upload";
import type { PhotoUploadDetail } from "@/types/photo-upload";

import type { NextRequest } from "next/server";

/**
 * Re-derives a fresh presigned preview URL for an already-registered photo. The one
 * `POST /api/vocabulary-photos` (PROMPT 28) returns is a 10-minute presigned URL — long expired
 * by the time a user reaches the PROMPT 31 review screen — so that screen re-fetches it here
 * instead of trying to carry the original URL across the OCR/word-extraction steps.
 */
export const GET = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/vocabulary-photos/[id]">,
  ): Promise<PhotoUploadDetail> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;
    const photoUpload = await db.photoUpload.findUnique({ where: { id } });
    // Not found or someone else's upload — 404 either way to avoid existence probing, matching
    // lib/ocr/process-photo.ts's convention.
    if (!photoUpload || photoUpload.user_id !== session.user.id) {
      throw new ApiError("NOT_FOUND", "사진을 찾을 수 없습니다.");
    }

    const previewUrl = await createPhotoPreviewUrl(photoUpload.storage_key);

    return {
      id: photoUpload.id,
      previewUrl,
      mimeType: photoUpload.mime_type,
      fileSize: photoUpload.file_size,
      width: photoUpload.width,
      height: photoUpload.height,
      status: photoUpload.status,
      createdAt: formatKstISOString(photoUpload.created_at),
    };
  },
);

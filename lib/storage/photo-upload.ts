import "server-only";

import { randomUUID } from "node:crypto";

import { ApiError } from "@/lib/api/error";
import {
  createPresignedGetUrl,
  createPresignedPutUrl,
  deleteObject,
  getObjectPrefix,
  headObject,
} from "@/lib/storage/client";
import {
  mimeMatchesFormat,
  readImageDimensions,
  sniffImageFormat,
} from "@/lib/storage/image-inspect";
import {
  PHOTO_ALLOWED_MIME_TYPES,
  PHOTO_MAX_BYTES,
  PHOTO_MIN_HEIGHT,
  PHOTO_MIN_WIDTH,
} from "@/lib/validations/photo-upload";

const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 10 * 60;
/** Enough to reach the SOF marker of virtually all real-world JPEGs, even with a large embedded EXIF thumbnail. */
const INSPECT_PREFIX_BYTES = 512 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function buildPhotoStorageKey(userId: string, mimeType: string) {
  const extension = EXTENSION_BY_MIME[mimeType] ?? "bin";
  return `photo-uploads/${userId}/${randomUUID()}.${extension}`;
}

export async function createPhotoUploadTarget(userId: string, mimeType: string) {
  const storageKey = buildPhotoStorageKey(userId, mimeType);
  try {
    const uploadUrl = await createPresignedPutUrl(storageKey, mimeType, UPLOAD_URL_TTL_SECONDS);
    return { storageKey, uploadUrl, expiresInSeconds: UPLOAD_URL_TTL_SECONDS };
  } catch (err) {
    console.error(err);
    throw new ApiError(
      "STORAGE_ERROR",
      "업로드 준비 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    );
  }
}

/**
 * Re-checks the object that actually landed in storage — size, real magic-byte format vs. the
 * declared Content-Type, and (when parseable) real pixel dimensions — and deletes it on any
 * failure so a rejected upload never leaves an orphaned object behind. This is the "don't trust
 * client-only validation" server pass the roadmap requires; the presigned PUT step only fixes
 * a Content-Type on the object, not its size or true bytes.
 */
export async function verifyUploadedPhoto(
  storageKey: string,
  userId: string,
  clientDimensions?: { width?: number; height?: number },
) {
  if (!storageKey.startsWith(`photo-uploads/${userId}/`)) {
    // Not this user's key (or malformed) — 404 rather than 403 to avoid existence probing,
    // matching lib/vocabulary-ownership.ts's convention.
    throw new ApiError("NOT_FOUND", "업로드된 파일을 찾을 수 없습니다.");
  }

  let head;
  try {
    head = await headObject(storageKey);
  } catch (err) {
    console.error(err);
    throw new ApiError("STORAGE_ERROR", "업로드된 파일을 확인하지 못했습니다.");
  }
  if (!head) {
    throw new ApiError("NOT_FOUND", "업로드된 파일을 찾을 수 없습니다. 다시 업로드해주세요.");
  }

  const cleanupAndThrow = async (error: ApiError): Promise<never> => {
    await deleteObject(storageKey).catch((err) => console.error(err));
    throw error;
  };

  if (head.contentLength <= 0 || head.contentLength > PHOTO_MAX_BYTES) {
    return cleanupAndThrow(
      new ApiError(
        "FILE_TOO_LARGE",
        `파일 크기는 ${Math.floor(PHOTO_MAX_BYTES / (1024 * 1024))}MB 이하여야 해요.`,
      ),
    );
  }
  if (
    !head.contentType ||
    !(PHOTO_ALLOWED_MIME_TYPES as readonly string[]).includes(head.contentType)
  ) {
    return cleanupAndThrow(
      new ApiError("UNSUPPORTED_FILE_TYPE", "지원하지 않는 이미지 형식이에요."),
    );
  }

  const prefix = await getObjectPrefix(
    storageKey,
    Math.min(INSPECT_PREFIX_BYTES, head.contentLength),
  );
  const realFormat = sniffImageFormat(prefix);
  if (!realFormat || !mimeMatchesFormat(head.contentType, realFormat)) {
    return cleanupAndThrow(
      new ApiError(
        "UPLOAD_MISMATCH",
        "파일 내용이 실제 이미지 형식과 일치하지 않아요. 다른 파일을 시도해주세요.",
      ),
    );
  }

  const realDimensions = readImageDimensions(prefix, realFormat);
  const width = realDimensions?.width ?? clientDimensions?.width;
  const height = realDimensions?.height ?? clientDimensions?.height;

  if (width !== undefined && height !== undefined) {
    if (width < PHOTO_MIN_WIDTH || height < PHOTO_MIN_HEIGHT) {
      return cleanupAndThrow(
        new ApiError(
          "IMAGE_TOO_SMALL",
          `이미지 해상도가 너무 작아요. 가로/세로 ${PHOTO_MIN_WIDTH}px 이상의 사진을 사용해주세요.`,
        ),
      );
    }
  }

  return {
    mimeType: head.contentType,
    fileSize: head.contentLength,
    width: width ?? null,
    height: height ?? null,
  };
}

export async function createPhotoPreviewUrl(storageKey: string) {
  return createPresignedGetUrl(storageKey, DOWNLOAD_URL_TTL_SECONDS);
}

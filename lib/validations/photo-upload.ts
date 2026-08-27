import { z } from "zod";

/** Camera photos of a vocab notebook page routinely land in the 5-10MB range. */
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;
/** Below this, OCR (PROMPT 29) is unlikely to read handwriting/print reliably. */
export const PHOTO_MIN_WIDTH = 480;
export const PHOTO_MIN_HEIGHT = 480;

export const PHOTO_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type PhotoMimeType = (typeof PHOTO_ALLOWED_MIME_TYPES)[number];

const UNSUPPORTED_TYPE_MESSAGE =
  "지원하지 않는 이미지 형식이에요. jpg, png, webp, heic 파일만 업로드할 수 있어요.";
const TOO_LARGE_MESSAGE = `파일 크기는 ${Math.floor(PHOTO_MAX_BYTES / (1024 * 1024))}MB 이하여야 해요.`;

export const presignPhotoUploadSchema = z.object({
  mimeType: z
    .string()
    .refine((value) => (PHOTO_ALLOWED_MIME_TYPES as readonly string[]).includes(value), {
      message: UNSUPPORTED_TYPE_MESSAGE,
    }),
  fileSize: z
    .number()
    .int()
    .positive("빈 파일은 업로드할 수 없어요.")
    .max(PHOTO_MAX_BYTES, TOO_LARGE_MESSAGE),
});

export type PresignPhotoUploadInput = z.infer<typeof presignPhotoUploadSchema>;

export const registerPhotoUploadSchema = z.object({
  storageKey: z.string().trim().min(1, "storageKey가 필요해요."),
  /** Best-effort, client-measured dimensions — used only when the server can't read them itself. */
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type RegisterPhotoUploadInput = z.infer<typeof registerPhotoUploadSchema>;

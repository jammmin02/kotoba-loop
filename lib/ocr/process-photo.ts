import "server-only";

import { ApiError } from "@/lib/api/error";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import type { PhotoOcrResult } from "@/lib/generated/prisma/client";
import { OcrTimeoutError, recognizeJapaneseText } from "@/lib/ocr/client";
import { getObject } from "@/lib/storage/client";
import type { OcrResult } from "@/types/ocr";

function toOcrResult(row: PhotoOcrResult): OcrResult {
  return {
    id: row.id,
    photoUploadId: row.photo_upload_id,
    rawText: row.raw_text,
    charCount: row.char_count,
    processingMs: row.processing_ms,
    createdAt: formatKstISOString(row.created_at),
  };
}

/** Quality-metric logging (PROMPT 29) — no per-call cost to track since Tesseract.js runs in-process, so processing time and failure rate are what matter for monitoring. */
function logOcrOutcome(entry: Record<string, unknown>) {
  console.info("[ocr] result", entry);
}

/**
 * Runs OCR for an already-uploaded photo (PROMPT 28's `PhotoUpload`) and persists the raw text
 * as `PhotoOcrResult`. Idempotent when already completed — re-calling (e.g. a duplicate click)
 * returns the existing result instead of re-running Tesseract. Otherwise (pending or a previous
 * failure) it (re)runs OCR; callers surface a retry action on failure by calling this again.
 */
export async function processPhotoOcr(photoUploadId: string, userId: string): Promise<OcrResult> {
  const photoUpload = await db.photoUpload.findUnique({
    where: { id: photoUploadId },
    include: { ocrResult: true },
  });
  // Not found or someone else's upload — 404 either way to avoid existence probing, matching
  // lib/vocabulary-ownership.ts's convention.
  if (!photoUpload || photoUpload.user_id !== userId) {
    throw new ApiError("NOT_FOUND", "사진을 찾을 수 없습니다.");
  }

  if (photoUpload.status === "completed" && photoUpload.ocrResult) {
    return toOcrResult(photoUpload.ocrResult);
  }

  await db.photoUpload.update({ where: { id: photoUploadId }, data: { status: "processing" } });

  const startedAt = Date.now();

  let imageBytes: Uint8Array;
  try {
    imageBytes = await getObject(photoUpload.storage_key);
  } catch (err) {
    await db.photoUpload.update({ where: { id: photoUploadId }, data: { status: "failed" } });
    console.error(err);
    logOcrOutcome({ photoUploadId, status: "failed", reason: "storage_error" });
    throw new ApiError("STORAGE_ERROR", "사진을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
  }

  let text: string;
  try {
    const recognized = await recognizeJapaneseText(Buffer.from(imageBytes));
    text = recognized.text.trim();
  } catch (err) {
    await db.photoUpload.update({ where: { id: photoUploadId }, data: { status: "failed" } });
    const processingMs = Date.now() - startedAt;
    if (err instanceof OcrTimeoutError) {
      logOcrOutcome({ photoUploadId, status: "failed", reason: "timeout", processingMs });
      throw new ApiError("OCR_TIMEOUT", "텍스트 추출 시간이 너무 오래 걸려요. 다시 시도해주세요.");
    }
    console.error(err);
    logOcrOutcome({ photoUploadId, status: "failed", reason: "recognize_error", processingMs });
    throw new ApiError(
      "OCR_NO_TEXT_FOUND",
      "사진에서 텍스트를 읽지 못했어요. 더 밝고 선명하게 다시 촬영해주세요.",
    );
  }

  const processingMs = Date.now() - startedAt;

  if (!text) {
    await db.photoUpload.update({ where: { id: photoUploadId }, data: { status: "failed" } });
    logOcrOutcome({ photoUploadId, status: "failed", reason: "no_text", processingMs });
    throw new ApiError(
      "OCR_NO_TEXT_FOUND",
      "사진에서 텍스트를 찾지 못했어요. 글자가 잘 보이도록 다시 촬영해주세요.",
    );
  }

  const ocrResult = await db.$transaction(async (tx) => {
    const saved = await tx.photoOcrResult.upsert({
      where: { photo_upload_id: photoUploadId },
      create: {
        photo_upload_id: photoUploadId,
        raw_text: text,
        char_count: text.length,
        processing_ms: processingMs,
      },
      update: { raw_text: text, char_count: text.length, processing_ms: processingMs },
    });
    await tx.photoUpload.update({ where: { id: photoUploadId }, data: { status: "completed" } });
    return saved;
  });

  logOcrOutcome({ photoUploadId, status: "completed", processingMs, charCount: text.length });

  return toOcrResult(ocrResult);
}

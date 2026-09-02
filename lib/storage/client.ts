import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const STORAGE_BUCKET = process.env.STORAGE_BUCKET ?? "";

/**
 * Backblaze B2 (kotoba-loop-roadmap.md B섹션 object-storage decision, changed
 * 2026-09-01 from Cloudflare R2 — R2 requires a card on file even for free-tier
 * usage; B2's free tier needs no payment method at signup). Vercel has no IAM
 * compute-role equivalent, so credentials are always passed explicitly via
 * server-only env vars rather than relying on a default credential provider
 * chain.
 *
 * forcePathStyle is required — B2's S3-compatible API doesn't support
 * virtual-hosted-style addressing (`<bucket>.<endpoint>`).
 *
 * requestChecksumCalculation/responseChecksumValidation are pinned to
 * "WHEN_REQUIRED" because newer AWS SDK v3 versions attach checksum headers by
 * default that non-AWS S3-compatible APIs don't support, which breaks
 * presigned URL signatures otherwise.
 */
export const s3 = new S3Client({
  region: process.env.STORAGE_REGION,
  endpoint: process.env.STORAGE_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "",
    secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "",
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export function createPresignedPutUrl(key: string, contentType: string, ttlSeconds: number) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: STORAGE_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: ttlSeconds },
  );
}

export function createPresignedGetUrl(key: string, ttlSeconds: number) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }), {
    expiresIn: ttlSeconds,
  });
}

/** Returns `null` if the object doesn't exist instead of throwing, so callers can 404 cleanly. */
export async function headObject(key: string) {
  try {
    const res = await s3.send(new HeadObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }));
    return { contentLength: res.ContentLength ?? 0, contentType: res.ContentType };
  } catch (err) {
    if (err instanceof NotFound) return null;
    throw err;
  }
}

/** Fetches only the first `byteLength` bytes — enough to sniff format/dimensions without downloading the whole photo. */
export async function getObjectPrefix(key: string, byteLength: number): Promise<Uint8Array> {
  const res = await s3.send(
    new GetObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
      Range: `bytes=0-${byteLength - 1}`,
    }),
  );
  const bytes = await res.Body?.transformToByteArray();
  return bytes ?? new Uint8Array(0);
}

/** Downloads the full object — used by OCR (PROMPT 29), which needs the whole image, not just a byte prefix. */
export async function getObject(key: string): Promise<Uint8Array> {
  const res = await s3.send(new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }));
  const bytes = await res.Body?.transformToByteArray();
  return bytes ?? new Uint8Array(0);
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }));
}

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
 * Native AWS S3 (kotoba-loop-roadmap.md B섹션 object-storage decision, migrated
 * 2026-08-27 from Cloudflare R2 — no custom endpoint/path-style/checksum
 * workarounds needed, S3 supports the SDK's defaults directly).
 *
 * Credentials are only passed explicitly when STORAGE_ACCESS_KEY/SECRET are set
 * (local dev via `.env.local`). In production (Amplify Hosting), leave them
 * unset and grant S3 access to the compute role instead — the SDK's default
 * credential provider chain picks that up automatically, so no access key ever
 * needs to exist.
 */
export const s3 = new S3Client({
  region: process.env.STORAGE_REGION ?? "ap-northeast-2",
  ...(process.env.STORAGE_ACCESS_KEY && process.env.STORAGE_SECRET_KEY
    ? {
        credentials: {
          accessKeyId: process.env.STORAGE_ACCESS_KEY,
          secretAccessKey: process.env.STORAGE_SECRET_KEY,
        },
      }
    : {}),
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

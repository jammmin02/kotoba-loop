export interface PhotoUploadPresignResult {
  storageKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

export interface PhotoUploadRecord {
  id: string;
  previewUrl: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  status: "pending";
  createdAt: string;
}

/**
 * `GET /api/vocabulary-photos/[id]` response — re-derives a fresh presigned `previewUrl` for a
 * photo registered earlier (PROMPT 28), since the one `PhotoUploadRecord` carries is a short-lived
 * presigned URL that's long expired by the time a user reaches the PROMPT 31 review screen.
 * Unlike `PhotoUploadRecord`, `status` reflects OCR progress (PROMPT 29) too.
 */
export interface PhotoUploadDetail {
  id: string;
  previewUrl: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
}

export interface OcrResult {
  id: string;
  photoUploadId: string;
  rawText: string;
  charCount: number;
  processingMs: number;
  createdAt: string;
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { PixelCamera, PixelCheck, PixelImage, PixelSpinner } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import {
  PHOTO_ALLOWED_MIME_TYPES,
  PHOTO_MAX_BYTES,
  PHOTO_MIN_HEIGHT,
  PHOTO_MIN_WIDTH,
} from "@/lib/validations/photo-upload";
import type { OcrResult } from "@/types/ocr";
import type { PhotoUploadPresignResult, PhotoUploadRecord } from "@/types/photo-upload";

import type { ChangeEvent } from "react";

/** OCR runs server-side in-process (Tesseract.js) — a dense photo can take up to a minute. */
const OCR_TIMEOUT_MS = 65_000;

type Stage = "idle" | "uploading" | "registering" | "ocr" | "done" | "error";

const ACCEPT = PHOTO_ALLOWED_MIME_TYPES.join(",");

// Some mobile browsers (notably HEIC from non-Safari) report an empty `file.type` —
// fall back to the extension so client-side validation doesn't false-reject those files.
const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

function resolveMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME[ext] ?? "";
}

function validateFileLocally(file: File): { mimeType: string; error?: string } {
  const mimeType = resolveMimeType(file);
  if (!mimeType || !(PHOTO_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return {
      mimeType,
      error: "지원하지 않는 이미지 형식이에요. jpg, png, webp, heic 파일만 업로드할 수 있어요.",
    };
  }
  if (file.size <= 0) {
    return { mimeType, error: "빈 파일은 업로드할 수 없어요." };
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return {
      mimeType,
      error: `파일 크기는 ${Math.floor(PHOTO_MAX_BYTES / (1024 * 1024))}MB 이하여야 해요.`,
    };
  }
  return { mimeType };
}

/** Best-effort — used only as a quick client-side gate and as a fallback when the server can't parse real dimensions (e.g. HEIC). */
async function measureDimensions(
  file: File,
): Promise<{ width: number; height: number } | undefined> {
  if (typeof createImageBitmap !== "function") return undefined;
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return undefined;
  }
}

/** `fetch` can't report upload progress, so the direct-to-storage PUT uses XHR instead. */
function uploadWithProgress(
  url: string,
  file: File,
  mimeType: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", mimeType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("NETWORK_ERROR"));
    xhr.onabort = () => reject(new Error("NETWORK_ERROR"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("STORAGE_ERROR"));
    };
    xhr.send(file);
  });
}

export function PhotoUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [result, setResult] = useState<PhotoUploadRecord | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function runUpload(target: File, mimeType: string) {
    setStage("uploading");
    setProgress(0);
    setErrorMessage(undefined);

    try {
      const dimensions = await measureDimensions(target);
      if (
        dimensions &&
        (dimensions.width < PHOTO_MIN_WIDTH || dimensions.height < PHOTO_MIN_HEIGHT)
      ) {
        setStage("error");
        setErrorMessage(
          `이미지 해상도가 너무 작아요. 가로/세로 ${PHOTO_MIN_WIDTH}px 이상의 사진을 사용해주세요.`,
        );
        return;
      }

      const presign = await apiFetch<PhotoUploadPresignResult>("/api/vocabulary-photos/presign", {
        method: "POST",
        body: { mimeType, fileSize: target.size },
      });

      await uploadWithProgress(presign.uploadUrl, target, mimeType, setProgress);

      setStage("registering");
      const record = await apiFetch<PhotoUploadRecord>("/api/vocabulary-photos", {
        method: "POST",
        body: {
          storageKey: presign.storageKey,
          width: dimensions?.width,
          height: dimensions?.height,
        },
        timeoutMs: 20_000,
      });

      setResult(record);
      await runOcr(record.id);
    } catch (err) {
      setStage("error");
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error && err.message === "NETWORK_ERROR") {
        setErrorMessage("네트워크 연결에 실패했어요. 연결 상태를 확인하고 다시 시도해주세요.");
      } else {
        setErrorMessage("업로드 중 문제가 발생했어요. 다시 시도해주세요.");
      }
    }
  }

  async function runOcr(photoUploadId: string) {
    setStage("ocr");
    setErrorMessage(undefined);

    try {
      const ocr = await apiFetch<OcrResult>(`/api/vocabulary-photos/${photoUploadId}/ocr`, {
        method: "POST",
        timeoutMs: OCR_TIMEOUT_MS,
      });
      setOcrResult(ocr);
      setStage("done");
    } catch (err) {
      setStage("error");
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error && err.message === "NETWORK_ERROR") {
        setErrorMessage("네트워크 연결에 실패했어요. 연결 상태를 확인하고 다시 시도해주세요.");
      } else {
        setErrorMessage("텍스트 추출 중 문제가 발생했어요. 다시 시도해주세요.");
      }
    }
  }

  function handleRetry() {
    if (result) {
      void runOcr(result.id);
    } else if (file) {
      void runUpload(file, resolveMimeType(file));
    }
  }

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    const { mimeType, error } = validateFileLocally(selected);
    if (error) {
      setFile(null);
      setPreviewUrl(null);
      setResult(null);
      setOcrResult(null);
      setStage("error");
      setErrorMessage(error);
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResult(null);
    setOcrResult(null);
    void runUpload(selected, mimeType);
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setOcrResult(null);
    setStage("idle");
    setErrorMessage(undefined);
    setProgress(0);
  }

  const isBusy = stage === "uploading" || stage === "registering" || stage === "ocr";

  return (
    <div className="flex flex-col gap-6">
      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFileSelected}
      />

      {stage !== "done" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="flex-1"
            disabled={isBusy}
            onClick={() => cameraInputRef.current?.click()}
          >
            <PixelCamera className="size-4" aria-hidden="true" />
            사진 촬영
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={isBusy}
            onClick={() => galleryInputRef.current?.click()}
          >
            <PixelImage className="size-4" aria-hidden="true" />
            사진 선택
          </Button>
        </div>
      )}

      {previewUrl && (
        <Card className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote/optimizable asset */}
          <img
            src={previewUrl}
            alt="선택한 사진 미리보기"
            className="max-h-80 w-full border-2 border-pixel-ink object-contain"
          />

          {stage === "uploading" && <ProgressBar value={progress} label="업로드 중" />}
          {stage === "registering" && <ProgressBar value={100} label="확인 중" />}

          {stage === "ocr" && (
            <div className="flex items-center gap-3">
              <PixelSpinner
                className="size-5 shrink-0 animate-spin text-primary"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-bold text-foreground">텍스트를 추출하고 있어요</p>
                <p className="text-xs font-content text-foreground/60">
                  사진 크기와 글자 수에 따라 최대 1분 정도 걸릴 수 있어요.
                </p>
              </div>
            </div>
          )}

          {stage === "error" && errorMessage && (
            <div className="flex flex-col gap-2">
              <p role="alert" className="text-sm text-error">
                {errorMessage}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                  다시 시도
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={reset}>
                  새 사진 선택
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {stage === "error" && !previewUrl && errorMessage && (
        <p role="alert" className="text-sm text-error">
          {errorMessage}
        </p>
      )}

      {stage === "done" && result && ocrResult && (
        <Card variant="elevated" className="flex flex-col items-center gap-3 py-8 text-center">
          <PixelCheck className="size-10 text-success" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-lg font-bold text-foreground">텍스트 추출이 완료됐어요</p>
            <p className="text-sm font-content text-foreground/60">
              다음 단계에서 AI가 오류를 교정하고 단어를 찾아드려요.
            </p>
          </div>
          <pre className="w-full max-h-48 overflow-y-auto whitespace-pre-wrap break-words border-2 border-pixel-ink bg-surface p-3 text-left text-sm font-content text-foreground">
            {ocrResult.rawText}
          </pre>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={reset}>
              사진 다시 올리기
            </Button>
            <Link href={`/vocabulary/photos/${result.id}/review`}>
              <Button type="button">단어 찾기 시작</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

import "server-only";

import { runWithConcurrency } from "@/lib/ai/batch";
import {
  OCR_WORD_EXTRACTION_TYPE,
  extractOcrWords,
  MAX_OCR_WORDS,
} from "@/lib/ai/ocr-word-extraction";
import { WORD_ANALYSIS_TYPE, analyzeWord } from "@/lib/ai/word-analysis";
import type { WordAnalysisResult } from "@/lib/ai/word-analysis";
import { ApiError } from "@/lib/api/error";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { OcrWordBatchJob, OcrWordBatchJobView } from "@/types/ocr-word-batch";

/**
 * Kept low relative to lib/ai/client.ts's per-call AI_TIMEOUT_MS (30s default) — this whole
 * batch runs synchronously inside one request (see app/api/vocabulary-photos/[id]/words/analyze
 * /route.ts's maxDuration), so the concurrency has to leave enough serial rounds' worth of budget
 * for MAX_OCR_WORDS words to plausibly finish rather than racing every one of them in parallel.
 */
const BATCH_CONCURRENCY = 4;

function jobWhere(userId: string, photoUploadId: string) {
  return {
    user_id_analysis_type_input_ref: {
      user_id: userId,
      analysis_type: OCR_WORD_EXTRACTION_TYPE,
      input_ref: photoUploadId,
    },
  };
}

/** Not found or someone else's upload/OCR result — 404 either way, matching lib/ocr/process-photo.ts. */
async function requireOcrText(photoUploadId: string, userId: string): Promise<string> {
  const photoUpload = await db.photoUpload.findUnique({
    where: { id: photoUploadId },
    include: { ocrResult: true },
  });
  if (!photoUpload || photoUpload.user_id !== userId) {
    throw new ApiError("NOT_FOUND", "사진을 찾을 수 없습니다.");
  }
  if (!photoUpload.ocrResult) {
    throw new ApiError("OCR_NO_TEXT_FOUND", "먼저 사진에서 텍스트를 추출해주세요.");
  }
  return photoUpload.ocrResult.raw_text;
}

/**
 * Resolves each "done" word's `vocabularyAnalysisId` into the actual `WordAnalysisResult` it
 * points at, so the PROMPT 31 review screen gets furigana/meaning/examples/etc. in the same
 * response instead of needing a separate fetch per word.
 */
async function attachResults(job: OcrWordBatchJob, userId: string): Promise<OcrWordBatchJobView> {
  const doneIds = job.words
    .filter((word) => word.status === "done" && word.vocabularyAnalysisId)
    .map((word) => word.vocabularyAnalysisId as string);

  const analyses = doneIds.length
    ? await db.aIAnalysis.findMany({
        where: { id: { in: doneIds }, user_id: userId, analysis_type: WORD_ANALYSIS_TYPE },
        select: { id: true, result_json: true },
      })
    : [];
  const resultById = new Map(
    analyses.map((analysis) => [
      analysis.id,
      analysis.result_json as unknown as WordAnalysisResult,
    ]),
  );

  return {
    ...job,
    words: job.words.map((word) => ({
      ...word,
      result: word.vocabularyAnalysisId ? resultById.get(word.vocabularyAnalysisId) : undefined,
    })),
  };
}

/**
 * Runs the combined OCR-correction + word-splitting AI call (PROMPT 13 재사용) once per photo and
 * persists it as an `AIAnalysis(status=pending)` job document, or returns the existing one —
 * this is the "약 N개 단어 발견" step the roadmap wants shown before the (slower, costlier)
 * per-word batch analysis in `runOcrWordBatchAnalyze` starts.
 */
export async function getOrCreateOcrWordJob(
  photoUploadId: string,
  userId: string,
): Promise<OcrWordBatchJobView> {
  const existing = await db.aIAnalysis.findUnique({ where: jobWhere(userId, photoUploadId) });
  if (existing) {
    return attachResults(existing.result_json as unknown as OcrWordBatchJob, userId);
  }

  const rawText = await requireOcrText(photoUploadId, userId);
  const extracted = await extractOcrWords(rawText);

  const job: OcrWordBatchJob = {
    analysisId: "",
    photoUploadId,
    rawText,
    correctedText: extracted.correctedText,
    total: extracted.words.length,
    completed: 0,
    succeeded: 0,
    failed: 0,
    words: extracted.words.slice(0, MAX_OCR_WORDS).map((word) => ({
      original: word.original,
      corrected: word.corrected,
      status: "pending",
    })),
  };

  try {
    const created = await db.aIAnalysis.create({
      data: {
        user_id: userId,
        analysis_type: OCR_WORD_EXTRACTION_TYPE,
        input_ref: photoUploadId,
        result_json: job as unknown as Prisma.InputJsonValue,
        status: "pending",
      },
    });
    job.analysisId = created.id;
    await db.aIAnalysis.update({
      where: { id: created.id },
      data: { result_json: job as unknown as Prisma.InputJsonValue },
    });
    return attachResults(job, userId);
  } catch (err) {
    // Another request for the same photo won the race and persisted first — reuse its job
    // rather than erroring, matching lib/ai/cache.ts's withAnalysisCache convention.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await db.aIAnalysis.findUnique({ where: jobWhere(userId, photoUploadId) });
      if (winner) {
        return attachResults(winner.result_json as unknown as OcrWordBatchJob, userId);
      }
    }
    throw err;
  }
}

/** Read-only progress lookup for polling — never triggers extraction or analysis itself. */
export async function getOcrWordJob(
  photoUploadId: string,
  userId: string,
): Promise<OcrWordBatchJobView> {
  await requireOcrText(photoUploadId, userId);
  const existing = await db.aIAnalysis.findUnique({ where: jobWhere(userId, photoUploadId) });
  if (!existing) {
    throw new ApiError("NOT_FOUND", "먼저 단어 추출을 실행해주세요.");
  }
  return attachResults(existing.result_json as unknown as OcrWordBatchJob, userId);
}

/**
 * Runs PROMPT 13's `analyzeWord` for every not-yet-processed word in the job, `BATCH_CONCURRENCY`
 * at a time. Each word's outcome (success or failure) is written back to the job document as
 * soon as it settles — a GET poll against the same row while this is still running (a separate
 * HTTP request the Next.js server handles concurrently) observes live progress without needing
 * a streaming response. Safe to call again on a job that's already fully processed (no-op) or
 * partially processed (resumes only the still-pending words), so a client that retries after a
 * timeout doesn't re-pay for already-analyzed words.
 */
export async function runOcrWordBatchAnalyze(
  photoUploadId: string,
  userId: string,
): Promise<OcrWordBatchJobView> {
  await requireOcrText(photoUploadId, userId);

  const existing = await db.aIAnalysis.findUnique({ where: jobWhere(userId, photoUploadId) });
  if (!existing) {
    throw new ApiError("NOT_FOUND", "먼저 단어 추출을 실행해주세요.");
  }

  const job = existing.result_json as unknown as OcrWordBatchJob;
  const pendingIndices = job.words
    .map((word, index) => (word.status === "pending" ? index : -1))
    .filter((index) => index >= 0);

  if (pendingIndices.length === 0) {
    return attachResults(job, userId);
  }

  const recomputeCounts = () => {
    job.completed = job.words.filter((word) => word.status !== "pending").length;
    job.succeeded = job.words.filter((word) => word.status === "done").length;
    job.failed = job.words.filter((word) => word.status === "failed").length;
  };

  await runWithConcurrency(pendingIndices, BATCH_CONCURRENCY, async (wordIndex) => {
    const candidate = job.words[wordIndex];
    try {
      const analyzed = await analyzeWord(candidate.corrected, userId);
      job.words[wordIndex] = { ...candidate, status: "done", vocabularyAnalysisId: analyzed.id };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "분석에 실패했습니다.";
      if (!(err instanceof ApiError)) {
        console.error(err);
      }
      job.words[wordIndex] = { ...candidate, status: "failed", error: message };
    }

    recomputeCounts();
    await db.aIAnalysis.update({
      where: { id: existing.id },
      data: { result_json: job as unknown as Prisma.InputJsonValue },
    });
  });

  return attachResults(job, userId);
}

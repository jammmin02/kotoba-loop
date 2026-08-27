import type { WordAnalysisResult } from "@/lib/ai/word-analysis";

export type OcrWordStatus = "pending" | "done" | "failed";

export interface OcrWordCandidate {
  /** The word as it appeared in the raw Tesseract.js OCR text, misrecognition included. */
  original: string;
  /** The AI-corrected word that PROMPT 13's per-word analysis was (or will be) run against. */
  corrected: string;
  status: OcrWordStatus;
  /** Set once `status` is "done" — the `AIAnalysis` id holding this word's furigana/meaning/etc. */
  vocabularyAnalysisId?: string;
  /** Set once `status` is "failed" — a user-facing reason this word's analysis didn't complete. */
  error?: string;
}

/**
 * Persisted as one `AIAnalysis(analysis_type="ocr_word_extraction")` row's `result_json`
 * (kotoba-loop-roadmap.md PROMPT 30) — both the extraction step and the batch-analysis step
 * read/mutate this same document, so progress ("몇 개 중 몇 개 완료") is always queryable by
 * re-reading that one row instead of needing a separate job table.
 */
export interface OcrWordBatchJob {
  analysisId: string;
  photoUploadId: string;
  rawText: string;
  correctedText: string;
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  words: OcrWordCandidate[];
}

/**
 * `OcrWordCandidate` enriched with its resolved PROMPT 13 analysis (furigana/meaning/examples/etc)
 * — only API responses carry this; the persisted `AIAnalysis.result_json` job document itself
 * stores plain `OcrWordCandidate`s and resolves `result` on read (lib/ocr/word-batch.ts) so the
 * PROMPT 31 review screen never has to fetch each word's analysis separately.
 */
export interface OcrWordCandidateView extends OcrWordCandidate {
  /** Present once `status` is "done". */
  result?: WordAnalysisResult;
}

export interface OcrWordBatchJobView extends Omit<OcrWordBatchJob, "words"> {
  words: OcrWordCandidateView[];
}

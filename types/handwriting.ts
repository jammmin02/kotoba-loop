import type { KanjiSummary } from "@/types/kanji";

/** One pen stroke as parallel coordinate arrays, matching the ink format Google's
 *  handwriting recognizer expects (see lib/handwriting/google-input-tools.ts). */
export interface HandwritingStroke {
  x: number[];
  y: number[];
  t: number[];
}

export interface HandwritingRecognitionResult {
  /** Recognized candidates that exist in our 常用漢字 table, in the recognizer's ranked order. */
  matches: KanjiSummary[];
  /** All raw candidate characters the recognizer returned, including ones not in our table. */
  rawCandidates: string[];
}

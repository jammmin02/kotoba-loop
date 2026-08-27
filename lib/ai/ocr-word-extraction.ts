import "server-only";

import { z } from "zod";

import { runStructuredAnalysis } from "@/lib/ai/orchestrator";
import { VOCABULARY_WORD_MAX } from "@/lib/validations/vocabulary";

export const OCR_WORD_EXTRACTION_TYPE = "ocr_word_extraction";

/**
 * Safety cap on how many words one photo can produce (kotoba-loop-roadmap.md PROMPT 30 only
 * requires "20개 이상" to work in one pass) — bounds the batch AI-analysis cost/time of the next
 * step regardless of how much text a dense photo OCRs to. Must stay <= `BULK_SAVE_MAX_ITEMS`
 * (lib/validations/vocabulary.ts) — otherwise a fully-populated batch can't be saved in one call.
 */
export const MAX_OCR_WORDS = 60;

export const ocrWordCandidateSchema = z.object({
  /** The word as it appears in the raw OCR text, misrecognition included — kept so the
   * PROMPT 31 review UI can show the user what was corrected and why. */
  original: z.string().min(1).max(VOCABULARY_WORD_MAX),
  /** The corrected word that PROMPT 13's per-word analysis is run against. */
  corrected: z.string().min(1).max(VOCABULARY_WORD_MAX),
});

export const ocrWordExtractionSchema = z.object({
  correctedText: z.string().min(1).max(8000),
  words: z.array(ocrWordCandidateSchema).max(MAX_OCR_WORDS),
});

export type OcrWordExtractionResult = z.infer<typeof ocrWordExtractionSchema>;

const SYSTEM_PROMPT = `당신은 일본어 학습 앱 kotoba-loop의 OCR 결과 정리 도우미입니다.
사용자가 촬영한 일본어 단어장 사진을 Tesseract.js OCR로 추출한 원본 텍스트가 주어집니다. 이 텍스트에는
Tesseract.js 특유의 흔한 오인식이 섞여 있을 수 있습니다:
- 자형이 비슷한 문자 혼동 (예: ニ/二, ソ/ン/ツ, カ/力, 口/ロ, 千/干, リ/l, ヲ/フ)
- 줄바꿈이 단어 중간에서 끊기거나 띄어쓰기가 잘못 삽입/삭제됨
- 인쇄 상태나 손글씨 특성상 일부 획이 다른 문자로 오인식됨

작업 순서:
1. 문맥상 자연스러운 일본어가 되도록 원본 텍스트 전체를 1차 교정해 correctedText에 담으세요.
   확신이 없는 부분은 원본을 최대한 유지하고 무리하게 다른 단어로 바꾸지 마세요.
2. 교정된 텍스트에서 학습자가 단어장에 등록할 만한 "단어" 단위 후보를 words로 추출하세요.
   - 명사/동사/형용사/부사 등 실질적인 의미를 가진 단어 위주로 추출하세요.
   - 단독 조사(は/が/を/に/で 등), 구두점, 숫자만 있는 토큰, 의미 없는 파편은 제외하세요
     (최소한의 품사 필터링).
   - 사전형(기본형)으로 임의 변환하지 말고, 텍스트에 등장한 형태를 그대로 사용하세요.
3. words의 각 항목은 다음 두 필드로 구성하세요:
   - original: 이 단어에 대응하는 OCR 원본 텍스트 상의 표기(교정 전 형태 그대로, 오인식이 남아있어도
     그대로 반환)
   - corrected: original을 교정한 최종 단어(다음 단계에서 이 값을 기준으로 사전 분석을 수행합니다)
   이미 올바르게 인식된 단어는 original과 corrected가 동일해도 됩니다.
4. 원본 텍스트에 실제로 등장하지 않는 단어를 지어내 추가하지 마세요. 근거 없는 추측은 금지합니다.`;

function buildUserPrompt(rawText: string): string {
  return `다음은 Tesseract.js가 추출한 OCR 원본 텍스트입니다. 위 지침에 따라 교정 및 단어 추출을 수행해주세요.

---
${rawText}
---`;
}

/**
 * Combines OCR-typo correction and word splitting into a single PROMPT 13 call, per
 * kotoba-loop-roadmap.md PROMPT 30's explicit instruction not to add a separate correction-only
 * API call. Callers persist the result themselves (lib/ocr/word-batch.ts) rather than through
 * lib/ai/cache.ts's withAnalysisCache, because this result gets progressively mutated afterward
 * (per-word batch-analysis progress) into a shape withAnalysisCache doesn't model.
 */
export async function extractOcrWords(rawText: string): Promise<OcrWordExtractionResult> {
  const { data } = await runStructuredAnalysis({
    analysisType: OCR_WORD_EXTRACTION_TYPE,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(rawText),
    schema: ocrWordExtractionSchema,
    maxTokens: 8192,
  });
  return data;
}

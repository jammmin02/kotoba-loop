import "server-only";

import { z } from "zod";

import { withAnalysisCache } from "@/lib/ai/cache";
import { runStructuredAnalysis } from "@/lib/ai/orchestrator";
import { normalizeSearchQuery } from "@/lib/search";
import {
  EXAMPLE_MAX,
  JLPT_LEVEL_OPTIONS,
  MAX_EXAMPLES,
  MAX_MEANINGS,
  MEANING_MAX,
  PART_OF_SPEECH_OPTIONS,
  VOCABULARY_READING_MAX,
  VOCABULARY_WORD_MAX,
} from "@/lib/validations/vocabulary";

export const WORD_ANALYSIS_TYPE = "vocabulary_analysis";

const MAX_RELATED = 10;

/**
 * Mirrors the PROMPT 10 Vocabulary schema for the overlapping fields
 * (word/reading/partOfSpeech/jlptLevel/meanings/examples) so a PROMPT 14
 * confirm step can save this straight into Vocabulary, plus the extra
 * chapter-9 fields (relatedKanji/synonyms/relatedExpressions) that only
 * exist at analysis time.
 */
export const wordAnalysisSchema = z.object({
  word: z.string().min(1).max(VOCABULARY_WORD_MAX),
  reading: z.string().min(1).max(VOCABULARY_READING_MAX),
  partOfSpeech: z.enum(PART_OF_SPEECH_OPTIONS),
  jlptLevel: z.enum(JLPT_LEVEL_OPTIONS).nullable(),
  meanings: z.array(z.string().min(1).max(MEANING_MAX)).min(1).max(MAX_MEANINGS),
  relatedKanji: z.array(z.string().min(1).max(4)).max(MAX_RELATED),
  examples: z
    .array(z.object({ japanese: z.string().min(1).max(EXAMPLE_MAX), korean: z.string().min(1).max(EXAMPLE_MAX) }))
    .min(1)
    .max(MAX_EXAMPLES),
  synonyms: z.array(z.string().min(1).max(VOCABULARY_WORD_MAX)).max(MAX_RELATED),
  relatedExpressions: z.array(z.string().min(1).max(VOCABULARY_WORD_MAX)).max(MAX_RELATED),
});

export type WordAnalysisResult = z.infer<typeof wordAnalysisSchema>;

const SYSTEM_PROMPT = `당신은 일본어 학습 앱 kotoba-loop의 단어 분석 도우미입니다.
사용자가 입력한 일본어 단어 하나를 분석해 한국어 학습자에게 필요한 정보를 구조화된 형식으로 반환하세요.

규칙:
- word 필드에는 입력받은 단어를 그대로(수정 없이) 반환하세요.
- reading에는 해당 단어의 후리가나(히라가나)를 반환하세요.
- partOfSpeech는 주어진 선택지 중 가장 적절한 값을 고르세요.
- jlptLevel은 실제 알고 있는 경우에만 채우고, 확신할 수 없으면 null로 두세요.
- meanings에는 자연스러운 한국어 뜻을 1개 이상 반환하세요.
- relatedKanji에는 단어를 구성하는 한자를 각각 하나씩 나열하세요(한자가 없는 단어는 빈 배열).
- examples에는 실생활에서 자연스러운 예문을 1개 이상(일본어+한국어 대응) 반환하세요.
- synonyms/relatedExpressions는 없으면 빈 배열로 반환하세요.
- 근거 없는 정보를 지어내지 마세요. 입력이 실제 존재하는 일본어 단어인지 확신할 수 없는 경우,
  meanings의 첫 항목에 "실제 존재하는 단어인지 확인이 필요합니다"라고 명시하고 jlptLevel은 null,
  relatedKanji/synonyms/relatedExpressions는 빈 배열로 반환하되, examples는 입력 문자열을 그대로
  사용한 예문 1개를 만들어 반환하세요(예문 필드는 항상 비어 있으면 안 됩니다).`;

function buildUserPrompt(word: string): string {
  return `다음 일본어 단어를 분석해주세요: ${word}`;
}

export interface AnalyzeWordResult {
  id: string;
  status: string;
  cached: boolean;
  result: WordAnalysisResult;
}

export async function analyzeWord(word: string, userId: string): Promise<AnalyzeWordResult> {
  const inputRef = normalizeSearchQuery(word);

  const { id, status, data, cached } = await withAnalysisCache({
    userId,
    analysisType: WORD_ANALYSIS_TYPE,
    inputRef,
    run: async () => {
      const { data } = await runStructuredAnalysis({
        analysisType: WORD_ANALYSIS_TYPE,
        system: SYSTEM_PROMPT,
        user: buildUserPrompt(inputRef),
        schema: wordAnalysisSchema,
      });
      return data;
    },
  });

  return { id, status, cached, result: data };
}

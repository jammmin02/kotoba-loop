import "server-only";

import { z } from "zod";

import { withAnalysisCache } from "@/lib/ai/cache";
import { runStructuredAnalysis } from "@/lib/ai/orchestrator";

export const SENTENCE_CORRECTION_ANALYSIS_TYPE = "sentence_correction";

const SENTENCE_MAX = 200;
const EXPLANATION_MAX = 300;

const sentenceCorrectionSchema = z.object({
  isAlreadyNatural: z.boolean(),
  corrected: z.string().min(1).max(SENTENCE_MAX),
  correctedKorean: z.string().min(1).max(SENTENCE_MAX),
  explanation: z.string().min(1).max(EXPLANATION_MAX),
});

export type SentenceCorrectionResult = z.infer<typeof sentenceCorrectionSchema>;

const SYSTEM_PROMPT = `당신은 일본어 학습 앱 kotoba-loop의 "문장 만들기" 첨삭 도우미입니다.
한국어 학습자가 특정 단어를 사용해 만든 일본어 문장을 자연스러운 표현으로 첨삭하세요(계획서 20장 취지).

규칙:
- isAlreadyNatural: 문장이 이미 자연스러워 고칠 필요가 없으면 true, 어색한 부분이 있으면 false.
- corrected: 자연스럽게 다듬은 문장을 반환하세요. isAlreadyNatural이 true이면 원문과 동일하게 반환하세요.
  절대 비워두지 마세요.
- correctedKorean: corrected를 자연스러운 한국어로 번역한 문장. 절대 비워두지 마세요.
- explanation: 무엇이 어색했고 왜 그렇게 고쳤는지(또는 이미 자연스러운 이유)를 한국어로 1~2문장,
  짧고 부담 없는 톤으로 설명하세요.
- 대상 단어가 문장에 자연스럽게 쓰였는지도 함께 고려하세요.
- 원문의 의미를 바꾸지 말고, 표현/문법/조사만 다듬으세요.`;

function buildUserPrompt(word: string, sentence: string): string {
  return `대상 단어: ${word}\n사용자가 만든 문장: ${sentence}`;
}

/**
 * 같은 단어에 같은 문장을 다시 요청하면 캐시를 맞히고, 사용자가 문장을 고쳐 다시 저장하면
 * (호출자가 새 sentence로 넘겨) 새 inputRef가 되어 새로 첨삭을 요청하게 한다(로드맵 PROMPT 20-A
 * "결과 캐싱" 요구사항).
 */
function buildInputRef(vocabularyId: string, sentence: string): string {
  return `${vocabularyId}:${sentence}`;
}

export interface CorrectSentenceResult {
  cached: boolean;
  result: SentenceCorrectionResult;
}

export async function correctSentence(
  vocabularyId: string,
  word: string,
  sentence: string,
  userId: string,
): Promise<CorrectSentenceResult> {
  const inputRef = buildInputRef(vocabularyId, sentence);

  const { data, cached } = await withAnalysisCache({
    userId,
    analysisType: SENTENCE_CORRECTION_ANALYSIS_TYPE,
    inputRef,
    run: async () => {
      const { data } = await runStructuredAnalysis({
        analysisType: SENTENCE_CORRECTION_ANALYSIS_TYPE,
        system: SYSTEM_PROMPT,
        user: buildUserPrompt(word, sentence),
        schema: sentenceCorrectionSchema,
      });
      return data;
    },
  });

  return { cached, result: data };
}

import "server-only";

import { z } from "zod";

import { withAnalysisCache } from "@/lib/ai/cache";
import { runStructuredAnalysis } from "@/lib/ai/orchestrator";
import { EXAMPLE_MAX, VOCABULARY_WORD_MAX } from "@/lib/validations/vocabulary";

export const WORD_COMPARISON_ANALYSIS_TYPE = "word_comparison";

const NUANCE_MAX = 300;

const comparisonItemSchema = z.object({
  word: z.string().min(1).max(VOCABULARY_WORD_MAX),
  nuance: z.string().min(1).max(NUANCE_MAX),
  example: z.object({
    japanese: z.string().min(1).max(EXAMPLE_MAX),
    korean: z.string().min(1).max(EXAMPLE_MAX),
  }),
});

/**
 * `items`를 요청받은 단어 개수와 정확히 같은 길이로 강제한다(schema가 요청마다 새로 만들어지는
 * 이유) — 그렇지 않으면 AI가 일부 단어를 누락하거나 요청에 없던 단어를 끼워 넣어도 스키마
 * 검증만으로는 걸러지지 않는다.
 */
function buildComparisonSchema(wordCount: number) {
  return z.object({
    items: z.array(comparisonItemSchema).length(wordCount),
    summary: z.string().min(1).max(NUANCE_MAX),
  });
}

export type WordComparisonResult = z.infer<ReturnType<typeof buildComparisonSchema>>;

const SYSTEM_PROMPT = `당신은 일본어 학습 앱 kotoba-loop의 유사 표현 비교 도우미입니다.
사용자가 헷갈려하는 일본어 단어/표현 여러 개를 서로 비교해, 각각의 핵심 뉘앙스 차이와
자연스러운 예문을 한국어 학습자 관점에서 설명하세요(계획서 38장 예시: わざと/わざわざ/あえて/せっかく).

규칙:
- items는 입력받은 단어 순서 그대로, 정확히 같은 개수만큼 반환하세요(하나도 빠뜨리거나 추가하지 마세요).
- 각 item의 word 필드에는 입력받은 단어를 그대로(수정 없이) 반환하세요.
- nuance에는 그 단어만의 핵심 뉘앙스와 다른 단어들과 구별되는 지점을 1~3문장으로 설명하세요.
- example에는 그 뉘앙스가 드러나는 자연스러운 예문을 일본어+한국어 대응으로 하나씩 반환하세요.
- summary에는 전체를 관통하는 한두 문장 요약(언제 어떤 단어를 골라야 하는지)을 반환하세요.
- 입력한 단어가 실제 존재하는 일본어 표현인지 확신할 수 없는 경우, 그 단어의 nuance에
  "실제 존재하는 표현인지 확인이 필요합니다"라고 명시하고, example은 입력 문자열을 그대로
  사용한 예문을 만들어 반환하세요(예문 필드는 항상 비어 있으면 안 됩니다). 근거 없는 정보를
  지어내지 마세요.`;

function buildUserPrompt(words: string[]): string {
  const list = words.map((word, i) => `${i + 1}. ${word}`).join("\n");
  return `다음 ${words.length}개의 일본어 단어/표현을 서로 비교해주세요.\n${list}`;
}

/**
 * 재요청 시 같은 캐시를 맞히도록 정렬 후 콤마로 합쳐 정규화한다 — 어떤 순서로 골랐든,
 * 같은 단어 조합이면 같은 `inputRef`가 되어야 한다.
 */
function buildInputRef(words: string[]): string {
  return [...words].sort().join(",");
}

export interface CompareWordsResult {
  cached: boolean;
  result: WordComparisonResult;
}

export async function compareWords(words: string[], userId: string): Promise<CompareWordsResult> {
  const inputRef = buildInputRef(words);

  const { data, cached } = await withAnalysisCache({
    userId,
    analysisType: WORD_COMPARISON_ANALYSIS_TYPE,
    inputRef,
    run: async () => {
      const { data } = await runStructuredAnalysis({
        analysisType: WORD_COMPARISON_ANALYSIS_TYPE,
        system: SYSTEM_PROMPT,
        user: buildUserPrompt(words),
        schema: buildComparisonSchema(words.length),
      });
      return data;
    },
  });

  return { cached, result: data };
}

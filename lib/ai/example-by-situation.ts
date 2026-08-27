import "server-only";

import { z } from "zod";

import { withAnalysisCache } from "@/lib/ai/cache";
import { runStructuredAnalysis } from "@/lib/ai/orchestrator";
import { normalizeSearchQuery } from "@/lib/search";
import type { Situation } from "@/lib/validations/ai";
import { EXAMPLE_MAX } from "@/lib/validations/vocabulary";

export const EXAMPLE_BY_SITUATION_TYPE = "example_by_situation";

export const exampleBySituationSchema = z.object({
  japanese: z.string().min(1).max(EXAMPLE_MAX),
  korean: z.string().min(1).max(EXAMPLE_MAX),
});

export type ExampleBySituationResult = z.infer<typeof exampleBySituationSchema>;

const SYSTEM_PROMPT = `당신은 일본어 학습 앱 kotoba-loop의 예문 생성 도우미입니다.
주어진 일본어 단어를 사용해 지정된 상황에 자연스럽게 어울리는 예문을 하나 만드세요.

규칙:
- japanese에는 자연스러운 일본어 예문 한 문장만 반환하세요(부가 설명이나 괄호 표기 금지).
- korean에는 japanese에 대응하는 자연스러운 한국어 번역을 반환하세요.
- 예문에는 반드시 주어진 단어(또는 그 활용형)를 포함하세요.
- 상황에 따라 어휘와 말투(반말/존댓말 등)를 다르게 구성하세요:
  - 일상회화: 편안한 일상 대화체
  - 비즈니스: 격식 있는 존댓말, 업무 상황
  - JLPT: 시험 지문에 어울리는 문어체 표현
  - 친구와 대화: 친한 친구 사이의 반말체
  - 학교: 학교/수업 관련 상황
  - 여행: 여행지에서 쓸 법한 표현
- 근거 없는 정보를 지어내지 말고, 항상 실제로 자연스럽게 쓰이는 문장을 만드세요.`;

function buildUserPrompt(word: string, situation: Situation): string {
  return `단어: ${word}\n상황: ${situation}\n위 상황에 어울리는 예문을 만들어주세요.`;
}

export interface GenerateExampleResult {
  id: string;
  status: string;
  cached: boolean;
  situation: Situation;
  result: ExampleBySituationResult;
}

export async function generateExampleBySituation(
  word: string,
  situation: Situation,
  userId: string,
): Promise<GenerateExampleResult> {
  const normalizedWord = normalizeSearchQuery(word);
  const inputRef = `${normalizedWord}::${situation}`;

  const { id, status, data, cached } = await withAnalysisCache({
    userId,
    analysisType: EXAMPLE_BY_SITUATION_TYPE,
    inputRef,
    run: async () => {
      const { data } = await runStructuredAnalysis({
        analysisType: EXAMPLE_BY_SITUATION_TYPE,
        system: SYSTEM_PROMPT,
        user: buildUserPrompt(normalizedWord, situation),
        schema: exampleBySituationSchema,
      });
      return data;
    },
  });

  return { id, status, cached, situation, result: data };
}

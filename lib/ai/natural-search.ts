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
import { duplicateKey, findExistingVocabularies } from "@/lib/vocabulary-duplicate";
import type { DuplicateVocabularyCandidate } from "@/lib/vocabulary-duplicate";

export const NATURAL_SEARCH_TYPE = "natural_search";

const MAX_RELATED = 10;
const EXPLANATION_MAX = 200;

/**
 * PROMPT 42(계획서 39장): 정확한 단어를 몰라도 한국어 상황 설명으로 가장 적절한 일본어
 * 표현을 찾는다. `word`~`relatedExpressions`는 `wordAnalysisSchema`(lib/ai/word-analysis.ts)
 * 와 동일한 필드로 맞춰, 결과를 그대로 `VocabularyForm`의 `initialAnalysis.result`에 넘길
 * 수 있게 한다. `found`/`explanation`은 이 기능에서만 쓰는 추가 필드.
 */
export const naturalSearchAnswerSchema = z.object({
  found: z.boolean(),
  explanation: z.string().min(1).max(EXPLANATION_MAX),
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

export type NaturalSearchAnswer = z.infer<typeof naturalSearchAnswerSchema>;

const SYSTEM_PROMPT = `당신은 일본어 학습 앱 kotoba-loop의 자연어 단어 검색 도우미입니다.
사용자는 정확한 일본어 단어를 몰라서, 한국어로 상황이나 느낌을 설명합니다.
예: "일부러라는 뜻인데 상대방이 나를 위해 수고했다는 느낌의 일본어가 뭐였지?"
→ 가장 적절한 표현은 「わざわざ」입니다.

규칙:
- 설명에 가장 부합하는 일본어 단어/표현을 하나만 골라 word에 반환하세요.
- reading에는 후리가나(히라가나)를 반환하세요.
- partOfSpeech는 주어진 선택지 중 가장 적절한 값을 고르세요.
- jlptLevel은 실제 알고 있는 경우에만 채우고, 확신할 수 없으면 null로 두세요.
- meanings에는 자연스러운 한국어 뜻을 1개 이상 반환하세요.
- relatedKanji에는 단어를 구성하는 한자를 각각 하나씩 나열하세요(한자가 없으면 빈 배열).
- examples에는 사용자가 설명한 상황을 반영한 예문을 1개 이상(일본어+한국어 대응) 반환하세요.
- synonyms/relatedExpressions는 없으면 빈 배열로 반환하세요.
- explanation에는 "가장 적절한 표현은 「XXX」입니다." 형식으로 한 문장 요약을 반환하세요.
- found는 설명에 확신을 갖고 부합하는 일본어 표현을 찾았으면 true, 그렇지 않으면(설명이
  모호하거나, 일본어 단어와 무관하거나, 존재하지 않는 개념을 묻는 경우) false로 반환하세요.
- found가 false이더라도 모든 필드는 반드시 채워야 합니다. word/reading에는 가장 가까운
  추측이나 "찾음 없음"을 나타내는 짧은 안내 문구를 넣으세요. meanings 첫 항목은 "표현을
  찾지 못했어요"처럼 20자 이내의 짧은 문구로만 채우고, 왜 확신할 수 없는지·어떻게 다시
  질문하면 좋을지에 대한 자세한 한국어 안내는 explanation에만 쓰세요(explanation은
  200자를 넘지 않게 하세요). examples는 입력 문장을 그대로 사용한 예문 1개를 만들어
  반환하세요(예문 필드는 항상 비어 있으면 안 됩니다).
- 근거 없는 정보를 지어내지 마세요.`;

function buildUserPrompt(query: string): string {
  return `다음 상황 설명에 가장 적절한 일본어 표현을 찾아주세요: ${query}`;
}

export interface NaturalSearchResult {
  id: string;
  status: string;
  cached: boolean;
  query: string;
  result: NaturalSearchAnswer;
  /** 결과 단어가 사용자의 단어장에 이미 있으면 그 항목, 없으면(또는 found=false면) null. */
  existing: DuplicateVocabularyCandidate | null;
}

export async function naturalSearch(query: string, userId: string): Promise<NaturalSearchResult> {
  const inputRef = normalizeSearchQuery(query);

  const { id, status, data, cached } = await withAnalysisCache({
    userId,
    analysisType: NATURAL_SEARCH_TYPE,
    inputRef,
    run: async () => {
      const { data } = await runStructuredAnalysis({
        analysisType: NATURAL_SEARCH_TYPE,
        system: SYSTEM_PROMPT,
        user: buildUserPrompt(inputRef),
        schema: naturalSearchAnswerSchema,
      });
      return data;
    },
  });

  if (!data.found) {
    return { id, status, cached, query: inputRef, result: data, existing: null };
  }

  const existingByKey = await findExistingVocabularies(
    [{ word: data.word, reading: data.reading }],
    userId,
  );
  const existing = existingByKey.get(duplicateKey(data.word, data.reading)) ?? null;

  return { id, status, cached, query: inputRef, result: data, existing };
}

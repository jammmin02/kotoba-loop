import "server-only";

import { z } from "zod";

import { withAnalysisCache } from "@/lib/ai/cache";
import { runStructuredAnalysis } from "@/lib/ai/orchestrator";
import { db } from "@/lib/db";

export const KANJI_MNEMONIC_ANALYSIS_TYPE = "kanji_mnemonic";

const MNEMONIC_MAX = 300;

export const kanjiMnemonicSchema = z.object({
  mnemonic: z.string().min(1).max(MNEMONIC_MAX),
});

export type KanjiMnemonicResult = z.infer<typeof kanjiMnemonicSchema>;

const SYSTEM_PROMPT = `당신은 일본어 학습 앱 kotoba-loop의 한자 기억법 도우미입니다.
주어진 한자를 구성 요소(부수 등)로 분해해 외우기 쉬운 한국어 기억법을 만드세요(계획서 43장
예시: "休 = 亻(사람) + 木(나무) → 사람이 나무에 기대어 쉬다").

규칙:
- 실제로 그 한자를 이루는 요소를 근거로 설명하고, 존재하지 않는 부수나 잘못된 획수를
  지어내지 마세요.
- 부수 정보가 주어지지 않았거나 더 이상 쪼갤 수 없는 한자(부수 자체가 그 한자인 경우 등)는
  억지로 분해하지 말고, 모양이나 뜻에서 연상되는 이미지로 설명하세요.
- "구성 분해" 한 문장 + "연상 이미지/이야기" 한 문장, 총 2문장 이내의 한국어로 작성하세요.`;

function buildUserPrompt(input: {
  character: string;
  radical: string;
  meaning: string;
  onyomi: string[];
  kunyomi: string[];
  strokeCount: number;
}): string {
  const { character, radical, meaning, onyomi, kunyomi, strokeCount } = input;
  const radicalLine = radical.trim() ? `부수: ${radical}` : "부수 정보 없음";
  return `한자: ${character}
${radicalLine}
획수: ${strokeCount}
음독: ${onyomi.join(", ") || "-"}
훈독: ${kunyomi.join(", ") || "-"}
뜻: ${meaning}

위 한자를 외우기 쉬운 기억법으로 설명해주세요.`;
}

export interface GenerateKanjiMnemonicResult {
  cached: boolean;
  result: KanjiMnemonicResult;
}

export interface KanjiMnemonicInput {
  character: string;
  radical: string;
  meaning: string;
  onyomi: string[];
  kunyomi: string[];
  strokeCount: number;
}

/**
 * PROMPT 48(계획서 43장) — 한자 기억법 AI 생성. C.3 아키텍처 다이어그램이 기억법도 다른
 * AI 기능(예문/첨삭/취약점분석 등)과 동일하게 AIAnalysis 저장 경로를 타도록 명시하고 있어,
 * 별도 전역 캐시 테이블을 새로 만들지 않고 기존 withAnalysisCache(사용자별 캐시)를 그대로
 * 재사용한다 — 같은 사용자가 같은 한자를 다시 조회할 때 중복 비용이 발생하지 않는다.
 *
 * "다시 생성"은 캐시를 무시하고 새로 호출해야 하므로, withAnalysisCache가 만든 기존 행을
 * 먼저 지운 뒤 평소와 동일하게 호출한다(cache.ts의 unique 제약을 그대로 활용).
 */
export async function generateKanjiMnemonic(
  userId: string,
  kanjiId: string,
  input: KanjiMnemonicInput,
  options: { forceRegenerate?: boolean } = {},
): Promise<GenerateKanjiMnemonicResult> {
  if (options.forceRegenerate) {
    await db.aIAnalysis.deleteMany({
      where: { user_id: userId, analysis_type: KANJI_MNEMONIC_ANALYSIS_TYPE, input_ref: kanjiId },
    });
  }

  const { data, cached } = await withAnalysisCache({
    userId,
    analysisType: KANJI_MNEMONIC_ANALYSIS_TYPE,
    inputRef: kanjiId,
    run: async () => {
      const { data } = await runStructuredAnalysis({
        analysisType: KANJI_MNEMONIC_ANALYSIS_TYPE,
        system: SYSTEM_PROMPT,
        user: buildUserPrompt(input),
        schema: kanjiMnemonicSchema,
      });
      return data;
    },
  });

  return { cached, result: data };
}

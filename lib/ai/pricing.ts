// 토큰 비용 추정 — server-only 의존이 없어 단위 테스트할 수 있다.

// Rough per-1M-token USD pricing, only used for the cost estimate in usage
// logs — not billing-accurate. Update alongside AI_MODEL if it changes.
const PRICING_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** 프롬프트 캐시 단가 배율: 캐시 읽기는 입력 단가의 10%, 5분 캐시 쓰기는 125%. */
export const CACHE_READ_MULTIPLIER = 0.1;
export const CACHE_WRITE_MULTIPLIER = 1.25;

export interface TokenCounts {
  /** 캐시를 거치지 않은 입력 토큰(응답의 input_tokens). */
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

export function estimateCostUsd(model: string, tokens: TokenCounts): number {
  const pricing =
    PRICING_PER_MILLION_TOKENS[model] ?? PRICING_PER_MILLION_TOKENS["claude-sonnet-5"];
  const read = tokens.cacheReadInputTokens ?? 0;
  const write = tokens.cacheCreationInputTokens ?? 0;
  return (
    (tokens.inputTokens * pricing.input +
      read * pricing.input * CACHE_READ_MULTIPLIER +
      write * pricing.input * CACHE_WRITE_MULTIPLIER +
      tokens.outputTokens * pricing.output) /
    1_000_000
  );
}

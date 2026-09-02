import "server-only";

import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  InternalServerError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { AI_MAX_RETRIES, AI_MODEL, AI_TIMEOUT_MS, anthropic } from "@/lib/ai/client";
import { withRetry } from "@/lib/ai/retry";
import { ApiError } from "@/lib/api/error";

import type { Message } from "@anthropic-ai/sdk/resources/messages";
import type { z } from "zod";

/**
 * The AI Orchestration module (kotoba-loop-roadmap.md C.2): every LLM call in
 * this app goes through `runStructuredAnalysis` so prompt/schema validation,
 * retry policy, timeout, and usage logging stay standardized in one place —
 * individual features (word analysis, example generation, weakness
 * analysis, ...) only supply their own prompt + zod schema.
 */

/** Distinguishes "AI answered but violated the schema" from a transport-level SDK error, for retry classification. */
class SchemaValidationFailure extends Error {}

function isRetryableError(err: unknown): boolean {
  if (err instanceof SchemaValidationFailure) return true;
  if (err instanceof APIConnectionTimeoutError) return true;
  if (err instanceof RateLimitError) return true;
  if (err instanceof InternalServerError) return true;
  if (err instanceof APIConnectionError) return true;
  return false;
}

// Rough per-1M-token USD pricing, only used for the cost estimate in usage
// logs — not billing-accurate. Update alongside AI_MODEL if it changes.
const PRICING_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing =
    PRICING_PER_MILLION_TOKENS[model] ?? PRICING_PER_MILLION_TOKENS["claude-sonnet-5"];
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export interface UsageLog {
  analysisType: string;
  model: string;
  attempts: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  estimatedCostUsd: number;
}

export interface StructuredAnalysisParams<Schema extends z.ZodType> {
  analysisType: string;
  system: string;
  user: string;
  schema: Schema;
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface StructuredAnalysisResult<T> {
  data: T;
  usage: UsageLog;
}

export async function runStructuredAnalysis<Schema extends z.ZodType>({
  analysisType,
  system,
  user,
  schema,
  model = AI_MODEL,
  maxTokens = 4096,
  timeoutMs = AI_TIMEOUT_MS,
  maxRetries = AI_MAX_RETRIES,
}: StructuredAnalysisParams<Schema>): Promise<StructuredAnalysisResult<z.infer<Schema>>> {
  let attempts = 0;

  try {
    return await withRetry(
      async (attempt) => {
        attempts = attempt + 1;

        const response = await anthropic.messages.parse(
          {
            model,
            max_tokens: maxTokens,
            system,
            messages: [{ role: "user", content: user }],
            output_config: { format: zodOutputFormat(schema) },
          },
          { timeout: timeoutMs },
        );

        const usage = buildUsageLog(analysisType, model, attempts, response);
        // Minimal cost/token log for later monitoring — see roadmap PROMPT 13 requirements.
        console.info("[ai-orchestrator] usage", usage);

        // response.parsed_output is already schema-shaped when non-null, but AI
        // output is treated like any other external input (instructions 8) — it
        // is re-validated independently rather than trusted just because the SDK
        // produced it.
        const parsed = schema.safeParse(response.parsed_output);
        if (!parsed.success) {
          throw new SchemaValidationFailure(parsed.error.message);
        }

        return { data: parsed.data as z.infer<Schema>, usage };
      },
      { maxRetries, isRetryable: isRetryableError },
    );
  } catch (err) {
    if (err instanceof SchemaValidationFailure) {
      throw new ApiError(
        "AI_SCHEMA_INVALID",
        "AI 분석 결과가 올바른 형식이 아닙니다. 직접 입력해주세요.",
      );
    }
    if (err instanceof APIConnectionTimeoutError) {
      throw new ApiError("AI_TIMEOUT", "AI 분석이 시간 초과되었습니다. 직접 입력해주세요.");
    }
    if (err instanceof APIError) {
      throw new ApiError("EXTERNAL_API_ERROR", "AI 분석에 실패했습니다. 직접 입력해주세요.");
    }
    throw err;
  }
}

function buildUsageLog(
  analysisType: string,
  model: string,
  attempts: number,
  response: Message,
): UsageLog {
  const inputTokens = response.usage.input_tokens ?? 0;
  const outputTokens = response.usage.output_tokens ?? 0;
  return {
    analysisType,
    model,
    attempts,
    inputTokens,
    outputTokens,
    cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
    estimatedCostUsd: estimateCostUsd(model, inputTokens, outputTokens),
  };
}

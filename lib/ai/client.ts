import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Model defaults to Claude Sonnet 5 per the provider decision in
 * kotoba-loop-roadmap.md C.1 ("AI(LLM) 제공자: Claude API"; the doc pins the
 * provider, not a specific tier — Opus is intentionally excluded app-wide for
 * cost). Override via AI_MODEL only for deliberate cost/latency tuning, not
 * to reintroduce Opus.
 */
export const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-5";
export const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 30_000;
export const AI_MAX_RETRIES = Number.isFinite(Number(process.env.AI_MAX_RETRIES))
  ? Number(process.env.AI_MAX_RETRIES)
  : 2;

/**
 * The SDK's own `maxRetries` only covers transport-level failures (429/5xx/network)
 * and doesn't know about schema validation — lib/ai/orchestrator.ts implements a
 * single retry policy that covers both, so the client-level retry is disabled here.
 */
export const anthropic = new Anthropic({
  apiKey: process.env.LLM_API_KEY,
  maxRetries: 0,
});

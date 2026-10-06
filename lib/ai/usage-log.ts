import "server-only";

import { getAiUserId } from "@/lib/ai/usage-context";
import { db } from "@/lib/db";

/**
 * AI 호출 한 번의 토큰 사용량을 DB에 남긴다. 기록은 본 기능을 막으면 안 되므로 기다리지 않고(호출부가
 * await하지 않는다) 실패해도 로그만 남기고 삼킨다. 재시도로 버려진 응답도 토큰을 썼으므로 시도마다 기록한다.
 */
export function recordAiUsage(params: {
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): void {
  // 요청 컨텍스트는 이 함수가 동기적으로 실행되는 동안에만 읽을 수 있어 여기서 먼저 꺼낸다.
  const userId = getAiUserId();
  db.aiUsageLog
    .create({
      data: {
        user_id: userId,
        feature: params.feature,
        model: params.model,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
      },
    })
    .catch((err: unknown) => {
      console.error("[ai-usage] failed to record usage", err);
    });
}

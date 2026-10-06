// 한도 판정 순수 로직 — server-only 의존이 없어 단위 테스트할 수 있다.

export interface AiUsageLimits {
  perMinuteCalls: number;
  perDayCalls: number;
  perDayTokens: number;
}

export interface AiUsageSnapshot {
  minuteCalls: number;
  dayCalls: number;
  dayTokens: number;
}

/** 한도를 넘었으면 사용자에게 보여줄 메시지를, 아니면 null을 돌려준다. */
export function evaluateAiLimits(usage: AiUsageSnapshot, limits: AiUsageLimits): string | null {
  if (usage.minuteCalls >= limits.perMinuteCalls) {
    return "AI 요청이 너무 많아요. 잠시 후 다시 시도해주세요.";
  }
  if (usage.dayCalls >= limits.perDayCalls || usage.dayTokens >= limits.perDayTokens) {
    return "오늘 사용할 수 있는 AI 한도를 모두 썼어요. 내일 다시 이용해주세요.";
  }
  return null;
}

/** 필요 EXP(레벨 n→n+1) = EXP_PER_LEVEL_MULTIPLIER × n (계획서 확정값). */
export const EXP_PER_LEVEL_MULTIPLIER = 50;

/** EXP 지급 규칙(계획서 56장). KANJI_STUDY는 한자 퀴즈 제출 시 정답일 때만 지급된다(PROMPT 36,
 * `app/api/quiz/submit/route.ts`). */
export const EXP_REWARDS = {
  WORD_STUDY: 1,
  REVIEW_SUCCESS: 1,
  SENTENCE_MAKING: 3,
  KANJI_STUDY: 2,
  DAILY_COMPLETE: 10,
} as const;

/** 보유 가능한 스트릭 프리즈 최대 개수(PROMPT 27.5 — 계획서에 값이 없어 이 문서가 확정).
 * 레벨업으로 지급되는 시점에 이 한도를 넘는 분은 버려진다 — 무제한 누적되면 스트릭 자체가
 * 무의미해지는 것을 방지한다. */
export const STREAK_FREEZE_MAX_COUNT = 3;

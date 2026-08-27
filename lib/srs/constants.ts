/** 계획서 15장: 첫 학습 → 1일 → 3일 → 7일 → 14일 → 30일 → 60일 → 90일. */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60, 90] as const;

export const MAX_STAGE = REVIEW_INTERVALS_DAYS.length - 1;

/** 모르겠음: 다음날 재출제(간격 초기화). */
export const UNKNOWN_INTERVAL_DAYS = 1;

/**
 * 헷갈림: 계획서는 "1~2일 후"로만 명시되어 범위를 좁히지 않았다.
 * 순수 함수의 결정성을 위해 고정값 2일을 기본값으로 채택한다(추가 결정 필요 항목).
 */
export const HARD_INTERVAL_DAYS = 2;

/** 쉬움: "다음 단계보다 1단계 더 건너뜀"을 기본값으로 채택(추가 결정 필요 항목). */
export const EASY_STAGE_SKIP = 2;

/** interval_stage가 이 값 이하면 아직 LEARNING, 초과하면 REVIEW로 분류한다(추가 결정 필요 항목). */
export const LEARNING_MAX_STAGE = 1;

/** 오답률이 이 값 이상이면 WEAK로 전이한다(계획서 기본값). */
export const WEAK_WRONG_RATE_THRESHOLD = 0.4;

/**
 * ReviewHistory 기록은 퀴즈 단계(PROMPT 20)에서 연결되므로, 이 단계에서는
 * "최근 3회 중 2회 오답" 대신 누적 correct/wrong_count 기반 오답률로 대체 판단한다.
 * 표본이 너무 적을 때(1~2회) WEAK로 오판하지 않도록 최소 시행 횟수를 둔다.
 */
export const MIN_TOTAL_REVIEWS_FOR_WEAK_CHECK = 3;

/**
 * 플래시카드 평가(review-result API)도 오답노트(PROMPT 21)의 `ReviewHistory` 집계에 잡히도록
 * 남기는 `quiz_type` 값. 실제 퀴즈 유형(QuizType)과 겹치지 않는 별도 값으로 둬서, 필요하면
 * 나중에 "플래시카드에서 틀림"과 "퀴즈에서 틀림"을 구분할 수 있게 한다.
 */
export const FLASHCARD_REVIEW_HISTORY_QUIZ_TYPE = "FLASHCARD";

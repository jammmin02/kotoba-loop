/**
 * Daily Quest(계획서 55장 취지 + PROMPT 25가 확정한 단어 4종 + PROMPT 37이 추가한 한자 1종).
 * `title`의 `{count}`는 `formatQuestTitle`(lib/quest/engine.ts)이 실제 목표치로 치환한다.
 * `target_count`는 NEW_WORD_STUDY에서는 시딩 기본값일 뿐이고, 조회/증가 시점에는 항상
 * `resolveQuestTarget`이 User.daily_word_target으로 재계산한다.
 */
export const QUEST_CODES = {
  NEW_WORD_STUDY: "NEW_WORD_STUDY",
  REVIEW_COMPLETE: "REVIEW_COMPLETE",
  WEAK_RETRY: "WEAK_RETRY",
  SENTENCE_MAKING: "SENTENCE_MAKING",
  /** 한자 퀴즈 정답(PROMPT 37 추가) — 단어의 REVIEW_COMPLETE와 동일한 조건(정답)으로 진행된다. */
  KANJI_REVIEW_COMPLETE: "KANJI_REVIEW_COMPLETE",
} as const;

export type QuestCode = (typeof QUEST_CODES)[keyof typeof QUEST_CODES];

export const DAILY_QUEST_CODES: QuestCode[] = Object.values(QUEST_CODES);

export interface DailyQuestSeed {
  code: QuestCode;
  title: string;
  targetCount: number;
  expReward: number;
}

/** 마이그레이션 SQL이 시딩하는 값과 반드시 일치해야 한다(prisma/migrations의 add_daily_quests). */
export const DAILY_QUEST_SEEDS: DailyQuestSeed[] = [
  {
    code: QUEST_CODES.NEW_WORD_STUDY,
    title: "새 단어 {count}개 학습",
    targetCount: 10,
    expReward: 5,
  },
  {
    code: QUEST_CODES.REVIEW_COMPLETE,
    title: "복습 {count}개 완료",
    targetCount: 10,
    expReward: 5,
  },
  {
    code: QUEST_CODES.WEAK_RETRY,
    title: "오답 문제 재도전 {count}회 이상",
    targetCount: 1,
    expReward: 5,
  },
  {
    code: QUEST_CODES.SENTENCE_MAKING,
    title: "문장 만들기 {count}회 이상",
    targetCount: 1,
    expReward: 5,
  },
  {
    code: QUEST_CODES.KANJI_REVIEW_COMPLETE,
    title: "한자 복습 {count}개 완료",
    targetCount: 10,
    expReward: 5,
  },
];

/** 하루 Daily Quest를 전부 완료했을 때 추가로 지급하는 보너스(계획서 미지정 — 개별 보상과
 * 같은 5 EXP로 이 문서에서 확정). */
export const QUEST_ALL_COMPLETE_BONUS_EXP = 5;

/**
 * 업적 카탈로그(계획서 55장 + PROMPT 27이 확정한 값). `category`는 ERD(C.3)의
 * word|kanji|streak 중 이번 단계에서 실제로 시딩하는 word/kanji만 쓴다(schema.prisma의
 * AchievementCategory 주석 참고 — streak는 QuestType의 daily/weekly 처리와 같은 이유로 보류).
 */
export const ACHIEVEMENT_CODES = {
  WORD_REGISTER_FIRST: "WORD_REGISTER_FIRST",
  WORD_STUDY_10: "WORD_STUDY_10",
  WORD_STUDY_100: "WORD_STUDY_100",
  WORD_STUDY_500: "WORD_STUDY_500",
  WORD_STUDY_1000: "WORD_STUDY_1000",
  KANJI_100: "KANJI_100",
  KANJI_500: "KANJI_500",
  KANJI_1000: "KANJI_1000",
  KANJI_2136_MASTER: "KANJI_2136_MASTER",
} as const;

export type AchievementCode = (typeof ACHIEVEMENT_CODES)[keyof typeof ACHIEVEMENT_CODES];

export interface AchievementSeed {
  code: AchievementCode;
  category: "word" | "kanji";
  title: string;
  conditionValue: number;
}

/** "첫 단어 등록"(1회성) — 계획서 문구가 "학습"이 아니라 "등록"이므로, 아래 학습 임계값과
 * 달리 UserVocabulary 등록 수(POST /api/vocabularies 시점)를 조건으로 삼는다(이 문서가 확정). */
export const WORD_REGISTER_ACHIEVEMENT_SEEDS: AchievementSeed[] = [
  {
    code: ACHIEVEMENT_CODES.WORD_REGISTER_FIRST,
    category: "word",
    title: "첫 단어 등록",
    conditionValue: 1,
  },
];

/** "N단어 학습" 임계값 — 계획서 문구가 "학습"이므로 `learning_status`가 NEW를 벗어난
 * 단어 수를 조건으로 삼는다(이 문서가 확정, kotoba-loop-roadmap.md PROMPT 27 참고). */
export const WORD_STUDY_ACHIEVEMENT_SEEDS: AchievementSeed[] = [
  { code: ACHIEVEMENT_CODES.WORD_STUDY_10, category: "word", title: "단어 10개 학습", conditionValue: 10 },
  {
    code: ACHIEVEMENT_CODES.WORD_STUDY_100,
    category: "word",
    title: "단어 100개 학습",
    conditionValue: 100,
  },
  {
    code: ACHIEVEMENT_CODES.WORD_STUDY_500,
    category: "word",
    title: "단어 500개 학습",
    conditionValue: 500,
  },
  {
    code: ACHIEVEMENT_CODES.WORD_STUDY_1000,
    category: "word",
    title: "단어 1,000개 학습",
    conditionValue: 1000,
  },
];

/** 한자 업적 — `checkKanjiStudyAchievements`(lib/achievement/service.ts)가 한자 퀴즈 제출 시마다
 * 실제 `UserKanji` 학습 수를 기준으로 체크한다(PROMPT 36). */
export const KANJI_ACHIEVEMENT_SEEDS: AchievementSeed[] = [
  { code: ACHIEVEMENT_CODES.KANJI_100, category: "kanji", title: "한자 초보(100자)", conditionValue: 100 },
  { code: ACHIEVEMENT_CODES.KANJI_500, category: "kanji", title: "한자 중급(500자)", conditionValue: 500 },
  {
    code: ACHIEVEMENT_CODES.KANJI_1000,
    category: "kanji",
    title: "한자 고급(1,000자)",
    conditionValue: 1000,
  },
  {
    code: ACHIEVEMENT_CODES.KANJI_2136_MASTER,
    category: "kanji",
    title: "상용한자 MASTER(2,136자)",
    conditionValue: 2136,
  },
];

/** 전체 카탈로그 — 마이그레이션 SQL(add_achievements)이 시딩하는 값과 반드시 일치해야 한다. */
export const ACHIEVEMENT_SEEDS: AchievementSeed[] = [
  ...WORD_REGISTER_ACHIEVEMENT_SEEDS,
  ...WORD_STUDY_ACHIEVEMENT_SEEDS,
  ...KANJI_ACHIEVEMENT_SEEDS,
];

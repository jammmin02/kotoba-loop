/** Mirrors the Prisma `JlptLevel` enum without importing the generated client into pure logic. */
export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

/** 계획서 17장의 6가지 단어 퀴즈 유형(일→한/한→일/후리가나/객관식/빈칸/예문해석). */
export const VOCAB_QUIZ_TYPES = [
  "JA_TO_KO",
  "KO_TO_JA",
  "FURIGANA",
  "MULTIPLE_CHOICE",
  "FILL_IN_BLANK",
  "SENTENCE_TRANSLATION",
] as const;

/** 계획서 33장의 3가지 한자 퀴즈 유형(뜻 맞히기/읽기/한자 선택, PROMPT 36). */
export const KANJI_QUIZ_TYPES = ["KANJI_MEANING", "KANJI_READING", "KANJI_SELECT"] as const;

/** 전체 유형 union. `QuizType`/검증 스키마 enum 용 — 대상별 기본 배정 목록은
 * `VOCAB_QUIZ_TYPES`/`KANJI_QUIZ_TYPES`를 따로 쓴다(둘을 섞어 배정하면 안 되므로). */
export const QUIZ_TYPES = [...VOCAB_QUIZ_TYPES, ...KANJI_QUIZ_TYPES] as const;

export type QuizType = (typeof QUIZ_TYPES)[number];

/** 문제 유형의 한국어 표시명 — 퀴즈 UI(PROMPT 20/36)와 AI 취약점 분석(PROMPT 38)이 공유한다. */
export const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  JA_TO_KO: "일 → 한",
  KO_TO_JA: "한 → 일",
  FURIGANA: "후리가나",
  MULTIPLE_CHOICE: "객관식",
  FILL_IN_BLANK: "빈칸 채우기",
  SENTENCE_TRANSLATION: "예문 해석",
  KANJI_MEANING: "한자 뜻",
  KANJI_READING: "한자 읽기",
  KANJI_SELECT: "한자 선택",
};

/** 퀴즈 대상 종류 — `ReviewTargetType`(Prisma)과 대응한다. */
export const QUIZ_TARGET_TYPES = ["vocab", "kanji"] as const;
export type QuizTargetType = (typeof QUIZ_TARGET_TYPES)[number];

export interface QuizExample {
  japanese: string;
  korean: string;
}

/** 문제를 생성할 대상 단어. `Vocabulary` + 연관 `VocabularyMeaning`/`ExampleSentence`를 합친 형태다. */
export interface QuizVocabulary {
  id: string;
  word: string;
  reading: string;
  partOfSpeech: string;
  jlptLevel: JlptLevel | null;
  meanings: string[];
  examples: QuizExample[];
}

/** 객관식 오답 보기를 뽑아올 후보 풀의 항목. 대상 단어 자신도 포함해 넘기면 id로 걸러낸다. */
export interface QuizPoolEntry {
  id: string;
  partOfSpeech: string;
  jlptLevel: JlptLevel | null;
  meanings: string[];
}

/** 문제를 생성할 대상 한자(PROMPT 36). `Kanji` 테이블 그대로. */
export interface QuizKanji {
  id: string;
  character: string;
  onyomi: string[];
  kunyomi: string[];
  /** 常用漢字 학년(1~6 초등, 8 중학교 이상) — 객관식 오답 보기를 같은 난이도대에서 뽑는 기준. */
  schoolGrade: number | null;
  meaning: string;
}

/** 한자 객관식 오답 보기를 뽑아올 후보 풀의 항목. */
export interface QuizKanjiPoolEntry {
  id: string;
  character: string;
  schoolGrade: number | null;
  meaning: string;
}

export interface QuizChoice {
  id: string;
  text: string;
}

export interface QuizQuestion {
  quizType: QuizType;
  targetType: QuizTargetType;
  targetId: string;
  prompt: string;
  /** 객관식 문제(선택지가 있는 유형)에서만 채워진다. */
  choices?: QuizChoice[];
  /** 채점 기준 정답. 객관식은 정답 choice의 id를 담는다. */
  correctAnswer: string;
  /** 정답으로 함께 인정할 값(복수 뜻, 후리가나 대체 표기 등). 채점 시 correctAnswer와 함께 검사한다. */
  acceptableAnswers?: string[];
}

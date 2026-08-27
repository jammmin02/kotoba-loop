import type { JlptLevel, WordStatus } from "@/components/ui/badge";
import type { KanjiStatusCounts } from "@/lib/study/stats";

export interface KanjiSummary {
  character: string;
  koreanReading: string;
  meaning: string;
  schoolGrade: number | null;
  jlptLevelRef: JlptLevel | null;
}

export interface KanjiDetail extends KanjiSummary {
  onyomi: string[];
  kunyomi: string[];
  strokeCount: number;
  radical: string;
  /** UserKanji가 없으면 "NEW"로 취급한다(PROMPT 35 이전에는 UserKanji가 아예 생기지 않아
   *  항상 이 기본값이었고, PROMPT 35 이후로는 실제 리뷰 여부를 그대로 반영한다). */
  learningStatus: WordStatus;
}

/** `GET /api/kanji/progress` 응답(PROMPT 35). */
export type KanjiProgressResponse = KanjiStatusCounts;

/** `GET /api/kanji/quiz-queue` 응답(PROMPT 36) — "오늘의 한자" 대상 id 목록. */
export interface KanjiQuizQueueResponse {
  kanjiIds: string[];
}

/** 취약 한자에 딸린 추천 단어 하나(PROMPT 40) — 사용자가 아직 등록하지 않은, 그 한자를 포함한 단어. */
export interface WeakKanjiRecommendation {
  vocabularyId: string;
  word: string;
  reading: string;
  meanings: string[];
}

/** 취약 한자 판정 결과 하나(PROMPT 40, 계획서 37장). */
export interface WeakKanjiItem {
  kanjiId: string;
  character: string;
  koreanReading: string;
  meaning: string;
  /** 판정에 쓰인 최근 리뷰 수(최대 `RECENT_REVIEWS_FOR_WEAK_KANJI`). */
  recentCount: number;
  recentWrongCount: number;
  wrongRate: number;
  recommendations: WeakKanjiRecommendation[];
}

/** `GET /api/kanji/weak` 응답(PROMPT 40). */
export interface WeakKanjiResponse {
  items: WeakKanjiItem[];
}

/** `POST /api/kanji/[character]/mnemonic` 응답(PROMPT 48). */
export interface KanjiMnemonicResponse {
  cached: boolean;
  mnemonic: string;
}

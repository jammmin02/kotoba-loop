import type { JlptLevel, WordStatus } from "@/components/ui/badge";
import type { UnlockedAchievementView } from "@/types/achievement";
import type { TagSummary } from "@/types/tag";

export interface ExampleSentenceInput {
  japanese: string;
  korean: string;
}

export interface ExampleSentenceRecord extends ExampleSentenceInput {
  id: string;
  source: string | null;
}

export interface VocabularySummary {
  id: string;
  word: string;
  reading: string;
  partOfSpeech: string;
  jlptLevel: JlptLevel | null;
  learningStatus: WordStatus;
  meanings: string[];
  bookIds: string[];
  isFavorite: boolean;
  tags: TagSummary[];
  createdAt: string;
  /** 방금 이 요청으로 새로 잠금 해제된 업적(PROMPT 27) — 등록(POST) 응답에서만 값이 채워진다. */
  unlockedAchievements?: UnlockedAchievementView[];
}

export interface VocabularyDetail extends VocabularySummary {
  examples: ExampleSentenceInput[];
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
}

/** `POST /api/vocabularies/[id]/add-to-book` 응답 — 이미 존재하는 단어를 내 단어장에
 * 연결한 결과다. `alreadyOwned`가 true면 UserVocabulary는 그대로 두고 단어장 연결만
 * 추가했다는 뜻(그래서 업적 재판정도 하지 않는다). */
export interface AddToBookResult {
  vocabularyId: string;
  addedBookIds: string[];
  alreadyOwned: boolean;
  unlockedAchievements: UnlockedAchievementView[];
}

/** `POST /api/vocabularies/check-duplicates` 응답의 항목 하나(계획서 27장). */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existing?: {
    id: string;
    word: string;
    reading: string;
    partOfSpeech: string;
    jlptLevel: JlptLevel | null;
    meanings: string[];
    bookIds: string[];
  };
}

export type BulkSaveResolution = "create" | "skip" | "link";

export interface BulkSaveItemResult {
  resolution: BulkSaveResolution;
  /** "skip"이면 아무것도 만들지 않으므로 null. */
  vocabularyId: string | null;
}

/** `POST /api/vocabularies/bulk` 응답 — 요청한 `items`와 같은 순서의 `results`를 포함한다. */
export interface BulkSaveSummary {
  addedCount: number;
  linkedCount: number;
  skippedCount: number;
  vocabularyBookIds: string[];
  results: BulkSaveItemResult[];
  unlockedAchievements: UnlockedAchievementView[];
}

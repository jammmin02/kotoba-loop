import type { BookColor } from "@/lib/vocabulary-book-color";

export interface VocabularyBookSummary {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  /** 사용자가 고른 슬롯 색. 없으면 목록 순번으로 대체한다. */
  color?: BookColor | null;
  /** 관리자에 의해 숨김 처리됨(작성자 본인에게만 보인다). */
  isHidden?: boolean;
  createdAt: string;
  wordCount: number;
  masteredCount: number;
}

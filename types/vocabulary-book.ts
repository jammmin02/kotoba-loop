export interface VocabularyBookSummary {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  /** 관리자에 의해 숨김 처리됨(작성자 본인에게만 보인다). */
  isHidden?: boolean;
  createdAt: string;
  wordCount: number;
  masteredCount: number;
}

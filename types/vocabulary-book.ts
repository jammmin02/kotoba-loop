export interface VocabularyBookSummary {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  wordCount: number;
  masteredCount: number;
}

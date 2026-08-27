import type { WordStatus } from "@/components/ui/badge";
import type { WrongNotePeriod } from "@/lib/study/wrong-notes";

export interface WrongNoteItem {
  vocabularyId: string;
  word: string;
  reading: string;
  meanings: string[];
  learningStatus: WordStatus;
  totalCount: number;
  correctCount: number;
  wrongCount: number;
  accuracyRate: number;
  lastWrongAt: string;
}

export interface WrongNotesResponse {
  period: WrongNotePeriod;
  items: WrongNoteItem[];
}

export type { WrongNotePeriod };

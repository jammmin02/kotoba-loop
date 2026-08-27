import type { PaginatedResponse } from "@/types/api";
import type { VocabularySummary } from "@/types/vocabulary";

export interface SearchResponse {
  query: string;
  vocabularies: PaginatedResponse<VocabularySummary>;
  /**
   * Always empty until the Kanji table ships (Phase 9). Kept in the response
   * shape now so the API contract and client code don't need to change later.
   */
  kanji: unknown[];
}

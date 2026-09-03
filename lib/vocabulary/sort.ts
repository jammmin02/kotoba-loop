import type { VocabularySummary } from "@/types/vocabulary";

export type WordSortKey = "createdDesc" | "readingAsc" | "favoriteFirst" | "nextReviewAsc";

export const WORD_SORT_OPTIONS: { value: WordSortKey; label: string }[] = [
  { value: "createdDesc", label: "최근 추가순" },
  { value: "readingAsc", label: "가나다순" },
  { value: "favoriteFirst", label: "즐겨찾기 우선" },
  { value: "nextReviewAsc", label: "복습 예정순" },
];

function compareNextReviewAt(a: VocabularySummary, b: VocabularySummary): number {
  const aDate = a.nextReviewAt;
  const bDate = b.nextReviewAt;
  // 복습 예정일이 없는 단어(NEW 등)는 뒤로 보낸다 — "곧 복습할 단어"부터 보고 싶은 목적에 맞다.
  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  return aDate.localeCompare(bDate);
}

export function sortWordSummaries(
  words: VocabularySummary[],
  sortKey: WordSortKey,
): VocabularySummary[] {
  const sorted = [...words];
  switch (sortKey) {
    case "readingAsc":
      sorted.sort((a, b) => a.reading.localeCompare(b.reading, "ja"));
      break;
    case "favoriteFirst":
      sorted.sort(
        (a, b) =>
          Number(b.isFavorite) - Number(a.isFavorite) || b.createdAt.localeCompare(a.createdAt),
      );
      break;
    case "nextReviewAsc":
      sorted.sort(compareNextReviewAt);
      break;
    case "createdDesc":
    default:
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return sorted;
}

export function matchesWordQuery(word: VocabularySummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    word.word.toLowerCase().includes(q) ||
    word.reading.toLowerCase().includes(q) ||
    word.meanings.some((meaning) => meaning.toLowerCase().includes(q))
  );
}

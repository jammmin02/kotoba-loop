import { toKstDateKey } from "@/lib/datetime";
import { WORD_SORT_OPTIONS } from "@/lib/vocabulary/sort";
import type { WordSortKey } from "@/lib/vocabulary/sort";
import type { VocabularySummary } from "@/types/vocabulary";

/**
 * 단어 목록(/words)의 필터 상태. 모든 값이 URL 쿼리와 1:1로 대응해, 새로고침·링크 공유·상세에서
 * 뒤로가기 후에도 같은 목록이 복원된다. 단어장/상태/태그/즐겨찾기는 서버 쿼리 조건이고, 복습
 * 예정·검색어·정렬은 받아온 목록에 클라이언트에서 적용한다.
 */
export const STATUS_FILTER_OPTIONS = [
  { value: "", label: "전체 상태" },
  { value: "NEW", label: "NEW" },
  { value: "LEARNING", label: "학습중" },
  { value: "REVIEW", label: "복습" },
  { value: "WEAK", label: "취약" },
  { value: "MASTERED", label: "마스터" },
] as const;

export const DUE_FILTER_OPTIONS = [
  { value: "", label: "전체 복습 상태" },
  { value: "today", label: "오늘 복습할 단어" },
  { value: "overdue", label: "복습이 밀린 단어" },
  { value: "none", label: "복습 예정 없음" },
] as const;

export type DueFilter = "today" | "overdue" | "none";

export interface WordListFilters {
  bookId: string;
  status: string;
  tagId: string;
  favoriteOnly: boolean;
  due: DueFilter | "";
  query: string;
  sortKey: WordSortKey;
}

export const DEFAULT_SORT_KEY: WordSortKey = "createdDesc";

export const EMPTY_WORD_LIST_FILTERS: WordListFilters = {
  bookId: "",
  status: "",
  tagId: "",
  favoriteOnly: false,
  due: "",
  query: "",
  sortKey: DEFAULT_SORT_KEY,
};

const STATUS_VALUES = STATUS_FILTER_OPTIONS.map((option) => option.value).filter(Boolean);
const DUE_VALUES = DUE_FILTER_OPTIONS.map((option) => option.value).filter(Boolean);
const SORT_VALUES = WORD_SORT_OPTIONS.map((option) => option.value);

/** URL의 쿼리 키 — `bookId`는 기존 링크(`/words?bookId=...`)와 같은 이름을 유지한다. */
const PARAM = {
  bookId: "bookId",
  status: "status",
  tagId: "tagId",
  favorite: "favorite",
  due: "due",
  query: "q",
  sort: "sort",
} as const;

/** 알 수 없는 값은 기본값으로 떨어뜨린다(직접 고친 URL이나 오래된 링크가 화면을 깨지 않게). */
export function parseWordListFilters(params: Pick<URLSearchParams, "get">): WordListFilters {
  const status = params.get(PARAM.status) ?? "";
  const due = params.get(PARAM.due) ?? "";
  const sort = params.get(PARAM.sort) ?? "";

  return {
    bookId: params.get(PARAM.bookId) ?? "",
    status: STATUS_VALUES.includes(status as never) ? status : "",
    tagId: params.get(PARAM.tagId) ?? "",
    favoriteOnly: params.get(PARAM.favorite) === "1",
    due: DUE_VALUES.includes(due as never) ? (due as DueFilter) : "",
    query: params.get(PARAM.query) ?? "",
    sortKey: SORT_VALUES.includes(sort as WordSortKey) ? (sort as WordSortKey) : DEFAULT_SORT_KEY,
  };
}

/**
 * 필터를 쿼리로 되돌린다. `base`의 다른 파라미터(이 목록과 무관한 값)는 그대로 보존하고, 기본값인
 * 필터는 URL에서 뺀다.
 */
export function applyWordListFilters(
  base: URLSearchParams,
  filters: WordListFilters,
): URLSearchParams {
  const next = new URLSearchParams(base);
  const set = (key: string, value: string) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };

  set(PARAM.bookId, filters.bookId);
  set(PARAM.status, filters.status);
  set(PARAM.tagId, filters.tagId);
  set(PARAM.favorite, filters.favoriteOnly ? "1" : "");
  set(PARAM.due, filters.due);
  set(PARAM.query, filters.query.trim());
  set(PARAM.sort, filters.sortKey === DEFAULT_SORT_KEY ? "" : filters.sortKey);
  return next;
}

export type DueState = "none" | "overdue" | "today" | "later";

/**
 * 복습 예정일이 오늘(KST) 기준으로 어떤 상태인지. 날짜 키("YYYY-MM-DD")로 비교하므로 자정 경계와
 * 시각(시/분)에 흔들리지 않는다 — 서버의 "오늘 큐"(`next_review_at < 내일 0시`)와 같은 기준이다.
 */
export function getDueState(
  word: Pick<VocabularySummary, "nextReviewAt">,
  todayKey: string,
): DueState {
  if (!word.nextReviewAt) return "none";
  const dueKey = toKstDateKey(new Date(word.nextReviewAt));
  if (dueKey < todayKey) return "overdue";
  return dueKey === todayKey ? "today" : "later";
}

/** "오늘 복습할 단어"는 오늘 예정 + 밀린 것을 모두 포함한다(오늘 큐와 같다). */
export function matchesDueFilter(
  word: Pick<VocabularySummary, "nextReviewAt">,
  due: DueFilter | "",
  todayKey: string,
): boolean {
  if (!due) return true;
  const state = getDueState(word, todayKey);
  if (due === "today") return state === "today" || state === "overdue";
  return state === due;
}

export type FilterChipKey = "bookId" | "status" | "tagId" | "favorite" | "due" | "query";

export interface FilterChip {
  key: FilterChipKey;
  label: string;
}

interface ChipLookups {
  bookName: (id: string) => string | undefined;
  tagName: (id: string) => string | undefined;
}

/** 활성 필터를 칩 목록으로 만든다. 이름을 아직 모르는 단어장/태그(로딩 전)는 일반 라벨로 대신한다. */
export function buildFilterChips(filters: WordListFilters, lookups: ChipLookups): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.bookId) {
    chips.push({ key: "bookId", label: `단어장: ${lookups.bookName(filters.bookId) ?? "선택됨"}` });
  }
  if (filters.status) {
    const label = STATUS_FILTER_OPTIONS.find((option) => option.value === filters.status)?.label;
    chips.push({ key: "status", label: `상태: ${label ?? filters.status}` });
  }
  if (filters.tagId) {
    const name = lookups.tagName(filters.tagId);
    chips.push({ key: "tagId", label: name ? `태그: #${name}` : "태그 선택됨" });
  }
  if (filters.favoriteOnly) chips.push({ key: "favorite", label: "즐겨찾기만" });
  if (filters.due) {
    const label = DUE_FILTER_OPTIONS.find((option) => option.value === filters.due)?.label;
    chips.push({ key: "due", label: label ?? filters.due });
  }
  if (filters.query.trim()) chips.push({ key: "query", label: `검색: ${filters.query.trim()}` });
  return chips;
}

/** 칩 하나를 해제한 새 필터. */
export function clearFilter(filters: WordListFilters, key: FilterChipKey): WordListFilters {
  switch (key) {
    case "bookId":
      return { ...filters, bookId: "" };
    case "status":
      return { ...filters, status: "" };
    case "tagId":
      return { ...filters, tagId: "" };
    case "favorite":
      return { ...filters, favoriteOnly: false };
    case "due":
      return { ...filters, due: "" };
    case "query":
      return { ...filters, query: "" };
  }
}

/** 전체 초기화 — 정렬은 필터가 아니라 보는 방식이라 그대로 둔다. */
export function clearAllFilters(filters: WordListFilters): WordListFilters {
  return { ...EMPTY_WORD_LIST_FILTERS, sortKey: filters.sortKey };
}

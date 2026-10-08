import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyWordListFilters,
  buildFilterChips,
  clearAllFilters,
  clearFilter,
  EMPTY_WORD_LIST_FILTERS,
  getDueState,
  matchesDueFilter,
  parseWordListFilters,
} from "./filter";

import type { WordListFilters } from "./filter";

const TODAY = "2026-10-08";
const at = (iso: string | null) => ({ nextReviewAt: iso });

describe("getDueState / matchesDueFilter (KST 날짜 기준)", () => {
  it("예정일이 없으면 none", () => {
    assert.equal(getDueState(at(null), TODAY), "none");
  });

  it("어제 이전은 overdue, 오늘은 today, 내일 이후는 later", () => {
    assert.equal(getDueState(at("2026-10-07T23:59:00+09:00"), TODAY), "overdue");
    assert.equal(getDueState(at("2026-10-08T00:00:00+09:00"), TODAY), "today");
    assert.equal(getDueState(at("2026-10-08T23:59:59+09:00"), TODAY), "today");
    assert.equal(getDueState(at("2026-10-09T00:00:00+09:00"), TODAY), "later");
  });

  it("UTC로 표현된 시각도 KST 날짜로 판정한다", () => {
    // 2026-10-07T15:30:00Z = KST 2026-10-08 00:30 → 오늘
    assert.equal(getDueState(at("2026-10-07T15:30:00Z"), TODAY), "today");
  });

  it("오늘 복습할 단어 필터는 오늘 예정과 밀린 것을 모두 포함한다", () => {
    assert.equal(matchesDueFilter(at("2026-10-08T10:00:00+09:00"), "today", TODAY), true);
    assert.equal(matchesDueFilter(at("2026-10-01T10:00:00+09:00"), "today", TODAY), true);
    assert.equal(matchesDueFilter(at("2026-10-09T10:00:00+09:00"), "today", TODAY), false);
    assert.equal(matchesDueFilter(at(null), "today", TODAY), false);
  });

  it("밀린 단어 필터는 어제 이전만, 예정 없음 필터는 예정일이 없는 단어만 고른다", () => {
    assert.equal(matchesDueFilter(at("2026-10-08T10:00:00+09:00"), "overdue", TODAY), false);
    assert.equal(matchesDueFilter(at("2026-10-01T10:00:00+09:00"), "overdue", TODAY), true);
    assert.equal(matchesDueFilter(at(null), "none", TODAY), true);
    assert.equal(matchesDueFilter(at("2026-10-01T10:00:00+09:00"), "none", TODAY), false);
  });

  it("필터가 없으면 모두 통과한다", () => {
    assert.equal(matchesDueFilter(at(null), "", TODAY), true);
  });
});

describe("parseWordListFilters / applyWordListFilters", () => {
  const FULL: WordListFilters = {
    bookId: "book-1",
    status: "WEAK",
    tagId: "tag-1",
    favoriteOnly: true,
    due: "overdue",
    query: "食べる",
    sortKey: "readingAsc",
  };

  it("필터를 쿼리로 직렬화했다가 그대로 복원한다", () => {
    const params = applyWordListFilters(new URLSearchParams(), FULL);
    assert.deepEqual(parseWordListFilters(params), FULL);
  });

  it("기본값인 필터는 URL에 남기지 않는다", () => {
    const params = applyWordListFilters(new URLSearchParams(), EMPTY_WORD_LIST_FILTERS);
    assert.equal(params.toString(), "");
  });

  it("이 목록과 무관한 다른 파라미터는 보존한다", () => {
    const params = applyWordListFilters(new URLSearchParams("utm=x&status=NEW"), {
      ...EMPTY_WORD_LIST_FILTERS,
      favoriteOnly: true,
    });
    assert.equal(params.get("utm"), "x");
    assert.equal(params.get("status"), null);
    assert.equal(params.get("favorite"), "1");
  });

  it("알 수 없는 값은 기본값으로 떨어뜨린다", () => {
    const parsed = parseWordListFilters(new URLSearchParams("status=BOGUS&due=never&sort=zzz"));
    assert.equal(parsed.status, "");
    assert.equal(parsed.due, "");
    assert.equal(parsed.sortKey, "createdDesc");
  });

  it("기존 링크(/words?bookId=...)를 그대로 해석한다", () => {
    assert.equal(parseWordListFilters(new URLSearchParams("bookId=abc")).bookId, "abc");
  });

  it("검색어 앞뒤 공백은 URL에서 제거한다", () => {
    const params = applyWordListFilters(new URLSearchParams(), {
      ...EMPTY_WORD_LIST_FILTERS,
      query: "  犬 ",
    });
    assert.equal(params.get("q"), "犬");
  });
});

describe("필터 칩", () => {
  const lookups = {
    bookName: (id: string) => (id === "book-1" ? "N3 단어" : undefined),
    tagName: (id: string) => (id === "tag-1" ? "동사" : undefined),
  };

  it("활성 필터마다 칩이 하나씩 만들어진다", () => {
    const chips = buildFilterChips(
      {
        bookId: "book-1",
        status: "WEAK",
        tagId: "tag-1",
        favoriteOnly: true,
        due: "today",
        query: "犬",
        sortKey: "createdDesc",
      },
      lookups,
    );
    assert.deepEqual(
      chips.map((chip) => chip.label),
      [
        "단어장: N3 단어",
        "상태: 취약",
        "태그: #동사",
        "즐겨찾기만",
        "오늘 복습할 단어",
        "검색: 犬",
      ],
    );
  });

  it("이름을 아직 모르는 단어장/태그는 일반 라벨로 표시한다", () => {
    const chips = buildFilterChips(
      { ...EMPTY_WORD_LIST_FILTERS, bookId: "x", tagId: "y" },
      lookups,
    );
    assert.deepEqual(
      chips.map((chip) => chip.label),
      ["단어장: 선택됨", "태그 선택됨"],
    );
  });

  it("필터가 없으면 칩도 없다", () => {
    assert.deepEqual(buildFilterChips(EMPTY_WORD_LIST_FILTERS, lookups), []);
  });

  it("칩 하나를 해제하면 그 필터만 비워진다", () => {
    const filters: WordListFilters = {
      ...EMPTY_WORD_LIST_FILTERS,
      status: "NEW",
      favoriteOnly: true,
      due: "none",
    };
    assert.deepEqual(clearFilter(filters, "favorite"), { ...filters, favoriteOnly: false });
    assert.deepEqual(clearFilter(filters, "due"), { ...filters, due: "" });
  });

  it("전체 초기화는 정렬을 유지한다", () => {
    const filters: WordListFilters = {
      ...EMPTY_WORD_LIST_FILTERS,
      status: "NEW",
      query: "犬",
      sortKey: "readingAsc",
    };
    assert.deepEqual(clearAllFilters(filters), {
      ...EMPTY_WORD_LIST_FILTERS,
      sortKey: "readingAsc",
    });
  });
});

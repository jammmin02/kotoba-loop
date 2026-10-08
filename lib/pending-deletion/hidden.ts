/**
 * 삭제 대기 중(또는 방금 삭제 확정된) 항목을 화면에서 숨기는 규칙. 서버 데이터는 그대로 두고
 * 목록에서 가리기만 하므로, 실행 취소하면 항목이 그 자리에 그대로 돌아온다.
 */
export type HiddenSpec =
  | { kind: "word"; wordId: string }
  /** 단어장에서 단어를 빼는 요청 — 다른 단어장에도 없게 되면 단어 자체가 삭제된다. */
  | { kind: "book-words"; bookId: string; wordIds: string[] }
  | { kind: "book"; bookId: string };

type BookWordsSpec = Extract<HiddenSpec, { kind: "book-words" }>;

// 수천 개를 한꺼번에 빼는 요청에서도 단어마다 배열을 훑지 않도록 spec별 id 집합을 한 번만 만든다.
const wordIdSets = new WeakMap<BookWordsSpec, Set<string>>();

function wordIdSetOf(spec: BookWordsSpec): Set<string> {
  let set = wordIdSets.get(spec);
  if (!set) {
    set = new Set(spec.wordIds);
    wordIdSets.set(spec, set);
  }
  return set;
}

interface WordLike {
  id: string;
  /** 이 단어가 속한 모든 단어장. 모르면(없으면) 단어장 범위 밖에서는 숨기지 않는다. */
  bookIds?: string[];
}

/**
 * 단어가 목록에서 숨겨져야 하는지.
 * - 단어 삭제 요청이 있으면 어디서나 숨긴다.
 * - 단어장에서 빼는 요청은, 그 단어장 목록(`scopeBookId`)에서는 숨기고, 그 외 목록에서는
 *   "속한 모든 단어장에서 빠져 단어 자체가 사라지는 경우"에만 숨긴다.
 */
export function isWordHidden(
  word: WordLike,
  specs: readonly HiddenSpec[],
  scopeBookId?: string,
): boolean {
  let removedFrom: Set<string> | null = null;

  for (const spec of specs) {
    if (spec.kind === "word" && spec.wordId === word.id) return true;
    if (spec.kind === "book-words" && wordIdSetOf(spec).has(word.id)) {
      (removedFrom ??= new Set()).add(spec.bookId);
    }
  }
  if (!removedFrom) return false;

  if (scopeBookId && removedFrom.has(scopeBookId)) return true;
  const removed = removedFrom;
  return !!word.bookIds && word.bookIds.length > 0 && word.bookIds.every((id) => removed.has(id));
}

export function isBookHidden(bookId: string, specs: readonly HiddenSpec[]): boolean {
  return specs.some((spec) => spec.kind === "book" && spec.bookId === bookId);
}

/** 숨길 항목이 없으면 같은 배열을 그대로 돌려줘, 렌더마다 새 배열이 생기지 않게 한다. */
export function filterHiddenWords<T extends WordLike>(
  words: readonly T[],
  specs: readonly HiddenSpec[],
  scopeBookId?: string,
): readonly T[] {
  if (specs.length === 0) return words;
  return words.filter((word) => !isWordHidden(word, specs, scopeBookId));
}

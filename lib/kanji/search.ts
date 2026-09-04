export interface KanjiSearchRow {
  character: string;
  onyomi: string[];
  kunyomi: string[];
  korean_reading: string;
  meaning: string;
}

/**
 * `GET /api/kanji`(목록/검색)와 `GET /api/kanji/practice-pool`(퀴즈 연습 모드)이 공유하는
 * 검색 매칭 로직. 훈독의 오쿠리가나 구분점(예: "み.える")을 제거해 "みえる"로도 검색되게 한다.
 */
export function matchesKanjiQuery(kanji: KanjiSearchRow, normalizedQuery: string): boolean {
  const query = normalizedQuery.toLowerCase();
  return (
    kanji.character === normalizedQuery ||
    kanji.korean_reading.includes(normalizedQuery) ||
    kanji.meaning.toLowerCase().includes(query) ||
    kanji.onyomi.some((reading) => reading.includes(normalizedQuery)) ||
    kanji.kunyomi.some((reading) => reading.replace(/\./g, "").includes(normalizedQuery))
  );
}

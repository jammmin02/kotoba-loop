/**
 * 단어장 슬롯 색상 팔레트. 서버 검증(zod)과 화면(book-slot, 색 선택 UI)이 같은 목록을 쓰도록
 * React 의존성 없이 분리했다. 색이 비어 있는(null) 단어장은 앞의 FALLBACK_BOOK_COLOR_COUNT개만
 * 순번으로 돌려 쓴다 — 팔레트를 늘리기 전에 만든 단어장의 색이 바뀌지 않게 하기 위해서다.
 */
export const BOOK_COLORS = [
  "mint",
  "pink",
  "primary",
  "accent",
  "sky",
  "lime",
  "coral",
  "grape",
] as const;

export type BookColor = (typeof BOOK_COLORS)[number];

export const FALLBACK_BOOK_COLOR_COUNT = 4;

/** DB의 자유 문자열(color 컬럼)을 팔레트 값으로 좁힌다. 알 수 없는 값은 null(순번 색)로 본다. */
export function toBookColor(value: string | null | undefined): BookColor | null {
  return (BOOK_COLORS as readonly string[]).includes(value ?? "") ? (value as BookColor) : null;
}

export const BOOK_COLOR_LABELS: Record<BookColor, string> = {
  mint: "민트",
  pink: "핑크",
  primary: "인디고",
  accent: "앰버",
  sky: "하늘",
  lime: "라임",
  coral: "코랄",
  grape: "포도",
};

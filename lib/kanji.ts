/** 常用漢字 학년(1~6은 초등, 8은 중학교 이상)을 표시용 문자열로 변환한다. */
export function formatSchoolGrade(grade: number | null): string {
  if (grade === null) return "-";
  return grade === 8 ? "중학교 이상" : `초등 ${grade}학년`;
}

export interface ParsedKanjiReading {
  /** 한자 부분(오쿠리가나 앞)만 남긴 읽기. 예: "くだ.す" → "くだ" */
  base: string;
  /** "." 뒤에 오는 오쿠리가나(送り仮名). 없으면 null. 예: "くだ.す" → "す" */
  okurigana: string | null;
}

/**
 * kanji-data(KANJIDIC2) 원본 표기는 "くだ.す"(오쿠리가나 구분점)나 "-くだ.す"(단독으로 안 쓰이고
 * 다른 말 뒤에 붙는 접미 전용 읽기 표시) 같은 사전용 부호를 그대로 담고 있어 그대로 보여주면
 * 읽기 어렵다. 접두/접미 전용 표시(선후행 "-")는 이 앱에서 구분해 보여줄 실익이 적어 제거하고,
 * 오쿠리가나 구분점만 base/okurigana로 분리해 "くだ(す)" 형태로 렌더링할 수 있게 한다.
 */
export function parseKanjiReading(raw: string): ParsedKanjiReading {
  const trimmed = raw.replace(/^-+|-+$/g, "");
  const dotIndex = trimmed.indexOf(".");
  if (dotIndex === -1) return { base: trimmed, okurigana: null };
  return { base: trimmed.slice(0, dotIndex), okurigana: trimmed.slice(dotIndex + 1) };
}

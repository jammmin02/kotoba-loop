const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const HIRAGANA_OFFSET = 0x60;

/** 가타카나를 히라가나로 변환한다. 장음부호(ー)처럼 대응 범위 밖의 문자는 그대로 둔다. */
function katakanaToHiragana(input: string): string {
  let result = "";
  for (const char of input) {
    const code = char.codePointAt(0)!;
    result +=
      code >= KATAKANA_START && code <= KATAKANA_END
        ? String.fromCodePoint(code - HIRAGANA_OFFSET)
        : char;
  }
  return result;
}

/**
 * 채점용 정규화(계획서 17장/PROMPT 19 요구사항): 전각/반각 통일(NFKC), 공백 전부 제거,
 * 가타카나→히라가나 통일, 대소문자 무시. 오탈자 교정까지는 다루지 않는다.
 */
export function normalizeAnswer(input: string): string {
  return katakanaToHiragana(input.normalize("NFKC")).replace(/\s+/g, "").toLowerCase();
}

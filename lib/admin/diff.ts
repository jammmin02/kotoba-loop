type Value = string | number | null | string[];

const MAX_LENGTH = 1000;

function format(value: Value): string {
  if (value === null) return "(없음)";
  if (Array.isArray(value)) return value.length > 0 ? value.join(" / ") : "(없음)";
  return String(value);
}

function same(a: Value, b: Value): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
}

/**
 * 수정 전후 값을 감사 로그용 한 줄 요약으로 만든다. 바뀐 필드만 "라벨: 이전 → 이후"로 `;`로 이어 붙이고,
 * 바뀐 게 없으면 null이다. 감사 로그 사유 칸이 무한히 커지지 않도록 길이를 자른다.
 */
export function describeChanges(
  before: Record<string, Value>,
  after: Record<string, Value>,
  labels: Record<string, string>,
): string | null {
  const parts: string[] = [];
  for (const key of Object.keys(labels)) {
    if (!same(before[key], after[key])) {
      parts.push(`${labels[key]}: ${format(before[key])} → ${format(after[key])}`);
    }
  }
  if (parts.length === 0) return null;
  const text = parts.join("; ");
  return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1)}…` : text;
}

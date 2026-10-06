const DOMAIN_PATTERN = /^@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** "g.yju.ac.kr", "@G.YJU.AC.KR " 같은 입력을 "@g.yju.ac.kr" 형태로 맞춘다. 올바르지 않으면 null. */
export function normalizeEmailDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  const withAt = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  return DOMAIN_PATTERN.test(withAt) ? withAt : null;
}

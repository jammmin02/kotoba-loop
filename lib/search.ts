/**
 * Normalizes a raw search query for comparison: NFKC collapses zenkaku
 * (full-width) alphanumerics/katakana and hankaku (half-width) katakana
 * into one canonical form, so a query typed in either width matches
 * words stored in the other.
 */
export function normalizeSearchQuery(input: string): string {
  return input.normalize("NFKC").trim();
}

/**
 * Escapes Postgres ILIKE pattern metacharacters (`%`, `_`, and the escape
 * character `\` itself) so literal occurrences in user input aren't
 * interpreted as wildcards by Prisma's `contains` filter.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (match) => `\\${match}`);
}

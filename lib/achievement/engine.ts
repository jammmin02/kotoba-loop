/**
 * Pure 업적 조건 판정 함수(lib/quest/engine.ts와 같은 패턴). No I/O — 이미 잠금 해제된
 * 업적인지 여부는 호출부(lib/achievement/service.ts)가 DB 조회로 걸러낸다.
 */
export function selectEligibleAchievementCodes(
  seeds: { code: string; conditionValue: number }[],
  count: number,
): string[] {
  return seeds.filter((seed) => count >= seed.conditionValue).map((seed) => seed.code);
}

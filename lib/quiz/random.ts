/**
 * 문제 생성/유형 배분에 쓰는 난수 유틸. `random`을 주입 가능하게 열어 두어(기본값 `Math.random`)
 * 테스트에서는 결정적 시퀀스를 넘겨 순수 함수로 검증할 수 있게 한다.
 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function pickRandom<T>(items: readonly T[], random: () => number = Math.random): T {
  return items[Math.floor(random() * items.length)];
}

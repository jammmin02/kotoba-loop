/**
 * 다음 복습까지의 일수를 버튼에 붙일 짧은 한국어 라벨로 바꾼다.
 * 1일 간격은 KST 기준 "내일"이다(`addKstDays`가 24시간 단위로 더한다).
 */
export function formatNextReviewLabel(days: number): string {
  if (days <= 0) return "오늘";
  if (days === 1) return "내일";
  return `${days}일 뒤`;
}

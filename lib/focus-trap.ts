/** 모달 안에서 키보드 포커스를 돌릴 수 있는(탭 이동 대상인) 요소를 고르는 셀렉터. */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export type TabWrapTarget = "first" | "last" | "container";

/**
 * Tab/Shift+Tab을 눌렀을 때 포커스를 직접 옮겨야 하는 경우만 목적지를 돌려준다(null이면 브라우저
 * 기본 이동에 맡긴다).
 *
 * @param activeIndex 현재 포커스된 요소가 포커스 가능 목록에서 몇 번째인지. 목록에 없으면(대화상자
 *   컨테이너 자신이거나 대화상자 밖) -1.
 * @param count 포커스 가능한 요소 수.
 */
export function getTabWrapTarget(
  activeIndex: number,
  count: number,
  shiftKey: boolean,
): TabWrapTarget | null {
  if (count === 0) return "container";
  if (activeIndex === -1) return shiftKey ? "last" : "first";
  if (shiftKey && activeIndex === 0) return "last";
  if (!shiftKey && activeIndex === count - 1) return "first";
  return null;
}

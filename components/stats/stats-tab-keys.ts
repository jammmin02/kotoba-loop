// 통계 화면의 탭 정의 — 서버 페이지(`app/stats/page.tsx`)와 클라이언트 탭 컴포넌트가 함께 쓰므로
// "use client" 파일에 두지 않는다(서버에서 클라이언트 모듈의 함수를 호출할 수 없다).

export const STATS_TABS = [
  { key: "daily", label: "일간 요약" },
  { key: "report", label: "주간·월간 리포트" },
  { key: "composition", label: "작문" },
  { key: "conversation", label: "회화" },
] as const;

export type StatsTabKey = (typeof STATS_TABS)[number]["key"];

/** `/stats?tab=` 값을 탭 키로 바꾼다. 알 수 없는 값은 일간 요약이다. */
export function parseStatsTab(value: string | undefined): StatsTabKey {
  return STATS_TABS.find((t) => t.key === value)?.key ?? "daily";
}

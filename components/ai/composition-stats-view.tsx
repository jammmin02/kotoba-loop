"use client";

import { AiStatsPanel } from "@/components/stats/ai-stats-panel";

export function CompositionStatsView() {
  return (
    <AiStatsPanel
      queryKey={["composition", "stats"]}
      url="/api/composition/stats"
      copy={{
        title: "작문 통계",
        description: "지금까지의 작문 기록을 모아서 보여줘요.",
        questHref: "/ai/composition",
        questLabel: "작문하러 가기",
        unit: "문제",
        countLabel: "푼 문제",
        acceptedLabel: "정답 인정률",
        emptyTitle: "첫 작문을 시작해보세요",
        emptyDescription: "작문을 채점받으면 점수 추이와 자주 틀리는 유형이 여기에 쌓여요.",
        breakdownTitles: ["상황", "단어 수준", "작문 수준"],
      }}
    />
  );
}

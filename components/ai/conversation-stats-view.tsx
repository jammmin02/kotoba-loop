"use client";

import { AiStatsPanel } from "@/components/stats/ai-stats-panel";

export function ConversationStatsView() {
  return (
    <AiStatsPanel
      queryKey={["conversation", "stats"]}
      url="/api/conversation/stats"
      copy={{
        title: "회화 통계",
        description: "AI와 나눈 대화에서 내가 말한 문장을 모아서 보여줘요.",
        questHref: "/ai/conversation",
        questLabel: "회화하러 가기",
        unit: "번",
        countLabel: "말한 횟수",
        acceptedLabel: "자연스럽게 통한 비율",
        emptyTitle: "첫 대화를 시작해보세요",
        emptyDescription: "대화에서 채점을 받으면 점수 추이와 자주 틀리는 유형이 여기에 쌓여요.",
        breakdownTitles: ["상대", "단어 수준", "세부 상황"],
      }}
    />
  );
}

import { redirect } from "next/navigation";

/** 작문 통계는 사이드바 "통계"의 작문 탭으로 합쳐졌다. 옛 주소는 그쪽으로 보낸다. */
export default function AiCompositionStatsPage() {
  redirect("/stats?tab=composition");
}

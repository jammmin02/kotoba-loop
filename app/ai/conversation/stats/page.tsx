import { redirect } from "next/navigation";

/** 회화 통계는 사이드바 "통계"의 회화 탭에서 본다. */
export default function AiConversationStatsPage() {
  redirect("/stats?tab=conversation");
}

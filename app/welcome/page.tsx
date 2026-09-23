import { WelcomeIntro } from "@/components/welcome/welcome-intro";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "kotoba-loop — 외우고, 다시 만나고, 함께 자라는 일본어",
  description:
    "SRS 복습, 사진·AI 단어 등록, 한자 쓰기, 펫 키우기로 이어지는 일본어 단어·한자 학습 루프.",
};

// 비로그인 방문자용 앱 소개 온보딩. 로그인 상태면 proxy.ts가 홈(/)으로 돌려보낸다.
export default function WelcomePage() {
  return <WelcomeIntro />;
}

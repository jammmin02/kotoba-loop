import { redirect } from "next/navigation";

import { StreakCalendarView } from "@/components/game/streak-calendar-view";
import { PixelFlag, PixelFlame, PixelSearch, PixelSparkles } from "@/components/icons/pixel-icons";
import { QuestLinkCard } from "@/components/ui/quest-link-card";
import { auth } from "@/lib/auth";

export default async function StudyHubPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/study");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-xl font-extrabold text-foreground">단어 학습</h1>

      {/* 액션 3개(실제로 누르러 오는 목적)를 먼저 보여주고, 스트릭/캘린더는 옆(데스크톱)
       * 또는 아래(모바일)로 — 홈 화면의 lg:grid-cols-[448px_320px] 2단 패턴과 동일하게,
       * StreakCalendarView를 320px 고정폭 컬럼에 넣어 셀 크기를 자연히 줄인다(별도 컴팩트
       * 배리언트 없이 홈 사이드바와 같은 방식). 카드는 AI 학습 허브와 같은 QuestLinkCard로
       * "퀘스트 실행 파일"처럼 재스킨했다(2026-08-27). */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <QuestLinkCard
            href="/study/custom"
            fileName="STUDY_01.EXE"
            titleColor="pink"
            icon={PixelSparkles}
            iconColor="bg-primary text-primary-foreground"
            title="커스텀 학습"
            description="단어장과 게임 종류를 직접 골라서 학습해요."
            badge={{ label: "선택형", className: "bg-secondary text-secondary-foreground" }}
          />

          <QuestLinkCard
            href="/study/battle"
            fileName="STUDY_02.EXE"
            titleColor="mint"
            icon={PixelFlame}
            iconColor="bg-accent text-accent-foreground"
            title="실시간 대결 퀴즈"
            description="친구와 방을 만들어 같은 문제를 실시간으로 겨뤄요."
            badge={{ label: "LIVE", className: "bg-error text-error-foreground" }}
          />

          <QuestLinkCard
            href="/wrong-notes"
            fileName="STUDY_03.EXE"
            titleColor="primary"
            icon={PixelFlag}
            iconColor="bg-error text-error-foreground"
            title="오답노트"
            description="자주 틀리는 단어를 모아서 다시 풀어봐요."
            badge={{ label: "복습", className: "bg-warning text-warning-foreground" }}
          />

          <QuestLinkCard
            href="/dictionary"
            fileName="STUDY_04.EXE"
            titleColor="accent"
            icon={PixelSearch}
            iconColor="bg-success text-success-foreground"
            title="단어 사전"
            description="단어장에 추가하지 않아도, 궁금한 단어를 사전과 AI로 바로 찾아봐요."
            badge={{ label: "NEW", className: "bg-success text-success-foreground" }}
          />
        </div>

        <StreakCalendarView showHeading={false} />
      </div>
    </main>
  );
}

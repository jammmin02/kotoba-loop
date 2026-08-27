import { LogoutButton } from "@/components/auth/logout-button";
import { GameProfileHeader } from "@/components/game/game-profile-header";
import { HomeSidebar } from "@/components/home/home-sidebar";
import { PetWidget } from "@/components/pet/pet-widget";
import { ExamPlanCard } from "@/components/study/exam-plan-card";
import { QuestFab } from "@/components/study/quest-fab";
import { TodaySummaryView } from "@/components/study/today-summary-view";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      {/* 모바일은 grid-cols-1이라 아래 두 자식이 그냥 세로로 쌓여 기존 레이아웃과 동일하다.
       * lg 이상에서만 고정폭 2열(본문 448px + 사이드바 320px)로 갈라져 넓은 화면의 빈 여백을
       * HomeSidebar(오늘의 퀘스트/스트릭)로 채운다. */}
      <div className="mx-auto grid w-full grid-cols-1 items-start gap-6 lg:w-auto lg:grid-cols-[448px_320px]">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 lg:mx-0">
          {session?.user && (
            <div className="flex w-full flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-content text-sm text-foreground/60">
                  {session.user.name ?? session.user.email} 님, 환영합니다.
                </p>
                <LogoutButton />
              </div>
              <GameProfileHeader />
              <PetWidget />
            </div>
          )}
          {session?.user && <ExamPlanCard />}
          <TodaySummaryView />
        </div>

        {session?.user && <HomeSidebar />}
      </div>

      {session?.user && <QuestFab className="lg:hidden" />}
    </main>
  );
}

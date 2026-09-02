import { LogoutButton } from "@/components/auth/logout-button";
import { GameProfileHeader } from "@/components/game/game-profile-header";
import { PetWidget } from "@/components/pet/pet-widget";
import { ExamPlanCard } from "@/components/study/exam-plan-card";
import { QuestFab } from "@/components/study/quest-fab";
import { TodaySummaryView } from "@/components/study/today-summary-view";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      {/* 데스크탑 사이드바(오늘의 퀘스트 인라인 목록 + 스트릭/캘린더)를 없애고 1단 레이아웃으로
       * 통일했다(2026-09-02, 사용자 요청) — 퀘스트는 화면 크기와 무관하게 항상 QuestFab(아이콘
       * → 모달)로만 접근하고, 홈 화면에서 스트릭/캘린더는 완전히 제거했다(단, MY > 스트릭
       * `app/my/streak`와 학습 페이지 `app/study`에는 그대로 남아있다 — 홈 화면만의 결정). 빈
       * 사이드바 자리가 사라진 만큼 펫 위젯이 화면의 주인공으로 크게 보이게 됐다. */}
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
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

      {session?.user && <QuestFab />}
    </main>
  );
}

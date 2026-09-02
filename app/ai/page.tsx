import { redirect } from "next/navigation";

import { PixelLock, PixelSparkles } from "@/components/icons/pixel-icons";
import { QuestLinkCard } from "@/components/ui/quest-link-card";
import { auth } from "@/lib/auth";

/**
 * AI 학습 메뉴(계획서 59장 사이드바 "AI학습") 진입 허브. 지금은 표현 비교(PROMPT 41)와
 * 자연어 단어 검색(PROMPT 42)이 연결돼 있고, 나머지 항목(문장 만들기 등)은 각자의 구현
 * 시점에 이 목록에 추가된다 — 계획서 D.3/PROMPT 04가 명시한 "실제 페이지 연결은 각 기능
 * 구현 시점에 채운다" 방침 그대로다.
 *
 * 다른 화면들이 이미 쓰는 창 타이틀바 카드(Card title/titleColor)와 quest 배리언트를
 * 끌어와, 메뉴 항목을 "퀘스트 실행 파일"처럼 보이게 재구성했다(2026-08-27 리스킨,
 * QuestLinkCard는 단어 학습 허브와 공유).
 */
export default async function AiHomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/ai");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <PixelSparkles className="size-6 shrink-0 text-accent" aria-hidden="true" />
        <h1 className="text-xl font-bold text-foreground">AI 퀘스트 보드</h1>
      </div>
      <p className="-mt-4 ml-8 text-sm font-content text-foreground/60">
        오늘의 AI 퀘스트를 골라 입장하세요.
      </p>

      <div className="flex flex-col gap-5">
        <QuestLinkCard
          href="/ai/compare"
          fileName="QUEST_01.EXE"
          titleColor="pink"
          icon={PixelSparkles}
          iconColor="bg-primary text-primary-foreground"
          title="표현 비교"
          description="헷갈리는 단어를 골라 AI가 뉘앙스 차이를 비교해줘요."
          badge={{ label: "EXP +10", className: "bg-accent text-accent-foreground" }}
        />

        <QuestLinkCard
          href="/ai/search"
          fileName="QUEST_02.EXE"
          titleColor="mint"
          icon={PixelSparkles}
          iconColor="bg-accent text-accent-foreground"
          title="자연어 단어 검색"
          description="정확한 단어를 몰라도 상황을 설명하면 AI가 가장 적절한 표현을 찾아줘요."
          badge={{ label: "NEW", className: "bg-success text-success-foreground" }}
        />

        <div className="flex items-center gap-4 border-2 border-dashed border-pixel-ink/50 px-4 py-4 opacity-50">
          <span className="flex size-12 shrink-0 items-center justify-center border-2 border-dashed border-pixel-ink/50 text-foreground/40">
            <PixelLock className="size-5" aria-hidden="true" />
          </span>
          <div>
            <span className="text-sm font-bold text-foreground">문장 만들기</span>
            <p className="mt-0.5 text-xs font-content text-foreground/60">준비 중인 퀘스트예요.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

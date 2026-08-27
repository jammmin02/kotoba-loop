import Link from "next/link";
import { redirect } from "next/navigation";

import { PixelSparkles } from "@/components/icons/pixel-icons";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";

/**
 * AI 학습 메뉴(계획서 59장 사이드바 "AI학습") 진입 허브. 지금은 표현 비교(PROMPT 41)와
 * 자연어 단어 검색(PROMPT 42)이 연결돼 있고, 나머지 항목(문장 만들기 등)은 각자의 구현
 * 시점에 이 목록에 추가된다 — 계획서 D.3/PROMPT 04가 명시한 "실제 페이지 연결은 각 기능
 * 구현 시점에 채운다" 방침 그대로다.
 */
export default async function AiHomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/ai");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-xl font-bold text-foreground">AI 학습</h1>

      <Link href="/ai/compare">
        <Card className="flex items-center gap-3 transition hover:bg-background">
          <PixelSparkles className="size-6 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-foreground">표현 비교</span>
            <span className="text-sm font-content text-foreground/60">
              헷갈리는 단어를 골라 AI가 뉘앙스 차이를 비교해줘요.
            </span>
          </div>
        </Card>
      </Link>

      <Link href="/ai/search">
        <Card className="flex items-center gap-3 transition hover:bg-background">
          <PixelSparkles className="size-6 shrink-0 text-accent" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-foreground">자연어 단어 검색</span>
            <span className="text-sm font-content text-foreground/60">
              정확한 단어를 몰라도 상황을 설명하면 AI가 가장 적절한 표현을 찾아줘요.
            </span>
          </div>
        </Card>
      </Link>
    </main>
  );
}

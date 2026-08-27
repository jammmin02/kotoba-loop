import Link from "next/link";
import { redirect } from "next/navigation";

import { StreakCalendarView } from "@/components/game/streak-calendar-view";
import { PixelFlag, PixelFlame, PixelSparkles } from "@/components/icons/pixel-icons";
import { cardVariants } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default async function StudyHubPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/study");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <h1 className="text-xl font-extrabold text-foreground">단어 학습</h1>

      <StreakCalendarView showHeading={false} />

      <Link
        href="/study/custom"
        className={cn(
          cardVariants({ variant: "elevated" }),
          "flex w-full max-w-md items-center gap-3 p-4 transition hover:bg-surface",
        )}
      >
        <PixelSparkles className="size-8 text-primary" aria-hidden="true" />
        <div className="flex flex-col text-left">
          <span className="text-base font-bold text-foreground">커스텀 학습</span>
          <span className="text-sm font-content text-foreground/60">
            단어장과 게임 종류를 직접 골라서 학습해요
          </span>
        </div>
      </Link>

      <Link
        href="/study/battle"
        className={cn(
          cardVariants({ variant: "elevated" }),
          "flex w-full max-w-md items-center gap-3 p-4 transition hover:bg-surface",
        )}
      >
        <PixelFlame className="size-8 text-accent" aria-hidden="true" />
        <div className="flex flex-col text-left">
          <span className="text-base font-bold text-foreground">실시간 대결 퀴즈</span>
          <span className="text-sm font-content text-foreground/60">
            친구와 방을 만들어 같은 문제를 실시간으로 겨뤄요
          </span>
        </div>
      </Link>

      <Link
        href="/wrong-notes"
        className={cn(
          cardVariants({ variant: "elevated" }),
          "flex w-full max-w-md items-center gap-3 p-4 transition hover:bg-surface",
        )}
      >
        <PixelFlag className="size-8 text-error" aria-hidden="true" />
        <div className="flex flex-col text-left">
          <span className="text-base font-bold text-foreground">오답노트</span>
          <span className="text-sm font-content text-foreground/60">
            자주 틀리는 단어를 모아서 다시 풀어봐요
          </span>
        </div>
      </Link>
    </main>
  );
}

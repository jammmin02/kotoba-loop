import Link from "next/link";
import { redirect } from "next/navigation";

import { PixelDice, PixelSparkles } from "@/components/icons/pixel-icons";
import { KanjiListView } from "@/components/kanji/kanji-list-view";
import { KanjiProgressCard } from "@/components/kanji/kanji-progress-card";
import { WeakKanjiCard } from "@/components/kanji/weak-kanji-card";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default async function KanjiListPage(props: PageProps<"/kanji">) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/kanji");
  }

  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const grade = typeof searchParams.grade === "string" ? searchParams.grade : "";
  const jlpt = typeof searchParams.jlpt === "string" ? searchParams.jlpt : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <KanjiProgressCard />
      <WeakKanjiCard />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/kanji/quiz"
          className={cn(buttonVariants({ variant: "quest", size: "lg" }), "w-full sm:w-fit")}
        >
          <PixelSparkles className="size-5" aria-hidden="true" />
          한자 퀴즈 풀기
        </Link>
        <Link
          href="/kanji/practice"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-fit")}
        >
          <PixelDice className="size-5" aria-hidden="true" />
          연습 모드 만들기
        </Link>
      </div>
      <KanjiListView initialQuery={q} initialGrade={grade} initialJlpt={jlpt} />
    </main>
  );
}

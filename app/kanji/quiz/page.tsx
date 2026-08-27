import { redirect } from "next/navigation";

import { KanjiQuizView } from "@/components/kanji/kanji-quiz-view";
import { auth } from "@/lib/auth";

export default async function KanjiQuizPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/kanji/quiz");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <KanjiQuizView />
    </main>
  );
}

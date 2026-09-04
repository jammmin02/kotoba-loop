import { redirect } from "next/navigation";

import { KanjiPracticeView } from "@/components/kanji/kanji-practice-view";
import { auth } from "@/lib/auth";

export default async function KanjiPracticePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/kanji/practice");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <KanjiPracticeView />
    </main>
  );
}

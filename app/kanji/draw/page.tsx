import { redirect } from "next/navigation";

import { HandwritingSearchView } from "@/components/kanji/handwriting-search-view";
import { auth } from "@/lib/auth";

export default async function KanjiHandwritingSearchPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/kanji/draw");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <HandwritingSearchView />
    </main>
  );
}

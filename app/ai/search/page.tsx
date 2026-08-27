import { redirect } from "next/navigation";

import { NaturalSearchView } from "@/components/ai/natural-search-view";
import { auth } from "@/lib/auth";

export default async function AiSearchPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/ai/search");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <NaturalSearchView />
    </main>
  );
}

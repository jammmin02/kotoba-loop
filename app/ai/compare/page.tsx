import { redirect } from "next/navigation";

import { WordComparisonView } from "@/components/ai/word-comparison-view";
import { auth } from "@/lib/auth";

export default async function AiComparePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/ai/compare");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <WordComparisonView />
    </main>
  );
}

import { redirect } from "next/navigation";

import { CompositionStatsView } from "@/components/ai/composition-stats-view";
import { auth } from "@/lib/auth";

export default async function AiCompositionStatsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/ai/composition/stats");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <CompositionStatsView />
    </main>
  );
}

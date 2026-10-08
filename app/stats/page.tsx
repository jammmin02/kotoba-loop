import { redirect } from "next/navigation";

import { parseStatsTab } from "@/components/stats/stats-tab-keys";
import { StatsTabs } from "@/components/stats/stats-tabs";
import { auth } from "@/lib/auth";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab = parseStatsTab(tab);

  const session = await auth();
  if (!session?.user) {
    const callbackUrl = initialTab === "daily" ? "/stats" : `/stats?tab=${initialTab}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <StatsTabs initialTab={initialTab} />
    </main>
  );
}

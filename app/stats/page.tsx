import { redirect } from "next/navigation";

import { StatsTabs } from "@/components/stats/stats-tabs";
import { auth } from "@/lib/auth";

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/stats");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <StatsTabs />
    </main>
  );
}

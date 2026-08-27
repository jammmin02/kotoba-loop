import { redirect } from "next/navigation";

import { AchievementListView } from "@/components/game/achievement-list-view";
import { auth } from "@/lib/auth";

export default async function AchievementsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/achievements");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <AchievementListView />
    </main>
  );
}

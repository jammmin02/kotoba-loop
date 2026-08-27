import { redirect } from "next/navigation";

import { StreakCalendarView } from "@/components/game/streak-calendar-view";
import { auth } from "@/lib/auth";

export default async function StreakPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/my/streak");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <StreakCalendarView />
    </main>
  );
}

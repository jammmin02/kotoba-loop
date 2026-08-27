import { redirect } from "next/navigation";

import { BattleLobbyView } from "@/components/battle/battle-lobby-view";
import { auth } from "@/lib/auth";

export default async function BattleLobbyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/study/battle");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-xl font-extrabold text-foreground">실시간 대결 퀴즈</h1>
      <BattleLobbyView />
    </main>
  );
}

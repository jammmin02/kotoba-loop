import { redirect } from "next/navigation";

import { BattleRoomView } from "@/components/battle/battle-room-view";
import { auth } from "@/lib/auth";

export default async function BattleRoomPage({ params }: PageProps<"/study/battle/[roomCode]">) {
  const { roomCode } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/study/battle/${roomCode}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <BattleRoomView roomCode={roomCode.toUpperCase()} currentUserId={session.user.id} />
    </main>
  );
}

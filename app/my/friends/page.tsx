import { redirect } from "next/navigation";

import { FriendsView } from "@/components/social/friends-view";
import { auth } from "@/lib/auth";

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/my/friends");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <FriendsView />
    </main>
  );
}

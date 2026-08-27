import { redirect } from "next/navigation";

import { PetHistoryView } from "@/components/pet/pet-history-view";
import { auth } from "@/lib/auth";

export default async function MyPetPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/my/pet");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <PetHistoryView />
    </main>
  );
}

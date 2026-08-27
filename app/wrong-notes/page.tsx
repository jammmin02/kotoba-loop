import { redirect } from "next/navigation";

import { WrongNotesView } from "@/components/study/wrong-notes-view";
import { auth } from "@/lib/auth";

export default async function WrongNotesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/wrong-notes");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <WrongNotesView />
    </main>
  );
}

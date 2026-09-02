import { redirect } from "next/navigation";

import { DictionaryView } from "@/components/dictionary/dictionary-view";
import { auth } from "@/lib/auth";

export default async function DictionaryPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dictionary");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <DictionaryView />
    </main>
  );
}

import { redirect } from "next/navigation";

import { VocabularyBooksView } from "@/components/vocabulary/vocabulary-books-view";
import { auth } from "@/lib/auth";

export default async function VocabularyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/vocabulary");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <VocabularyBooksView />
    </main>
  );
}

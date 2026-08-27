import { redirect } from "next/navigation";

import { WordsView } from "@/components/vocabulary/words-view";
import { auth } from "@/lib/auth";

export default async function WordsPage(props: PageProps<"/words">) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/words");
  }

  const searchParams = await props.searchParams;
  const bookId = typeof searchParams.bookId === "string" ? searchParams.bookId : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <WordsView initialBookId={bookId} />
    </main>
  );
}

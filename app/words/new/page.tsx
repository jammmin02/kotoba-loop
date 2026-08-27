import { redirect } from "next/navigation";

import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import { auth } from "@/lib/auth";

export default async function NewWordPage(props: PageProps<"/words/new">) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/words/new");
  }

  const searchParams = await props.searchParams;
  const bookId = typeof searchParams.bookId === "string" ? searchParams.bookId : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-xl font-bold text-foreground">새 단어 등록</h1>
      <VocabularyForm initialBookId={bookId} />
    </main>
  );
}

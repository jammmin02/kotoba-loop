import { redirect } from "next/navigation";

import { CustomStudyView } from "@/components/study/custom-study-view";
import { auth } from "@/lib/auth";

export default async function CustomStudyPage(props: PageProps<"/study/custom">) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/study/custom");
  }

  const searchParams = await props.searchParams;
  const bookId = typeof searchParams.bookId === "string" ? searchParams.bookId : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <h1 className="text-xl font-extrabold text-foreground">커스텀 학습</h1>
      <CustomStudyView initialBookId={bookId} />
    </main>
  );
}

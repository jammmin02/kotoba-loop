import { redirect } from "next/navigation";

import { StudySessionView } from "@/components/study/study-session-view";
import { auth } from "@/lib/auth";

export default async function StudySessionPage(props: PageProps<"/study/session">) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/study/session");
  }

  const searchParams = await props.searchParams;
  const tagId = typeof searchParams.tagId === "string" ? searchParams.tagId : undefined;
  const tagName = typeof searchParams.tagName === "string" ? searchParams.tagName : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <StudySessionView tagId={tagId} tagName={tagName} />
    </main>
  );
}

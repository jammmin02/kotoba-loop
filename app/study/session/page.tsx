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
  // "더 학습하기" — 오늘의 신규/복습 상한을 넘겨 한 번 더 학습한다.
  const extra = searchParams.extra === "1";

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <StudySessionView tagId={tagId} tagName={tagName} extra={extra} />
    </main>
  );
}

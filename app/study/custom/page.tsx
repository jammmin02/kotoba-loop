import { redirect } from "next/navigation";

import { CustomStudyView } from "@/components/study/custom-study-view";
import { auth } from "@/lib/auth";

export default async function CustomStudyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/study/custom");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <h1 className="text-xl font-extrabold text-foreground">커스텀 학습</h1>
      <CustomStudyView />
    </main>
  );
}

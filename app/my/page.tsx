import { redirect } from "next/navigation";

import { MyPageView } from "@/components/my/my-page-view";
import { auth } from "@/lib/auth";

export default async function MyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/my");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <MyPageView />
    </main>
  );
}

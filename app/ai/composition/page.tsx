import { redirect } from "next/navigation";

import { CompositionView } from "@/components/ai/composition-view";
import { auth } from "@/lib/auth";

export default async function AiCompositionPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/ai/composition");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <CompositionView />
    </main>
  );
}

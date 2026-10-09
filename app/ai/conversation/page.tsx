import { redirect } from "next/navigation";

import { ConversationView } from "@/components/ai/conversation-view";
import { auth } from "@/lib/auth";

export default async function AiConversationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/ai/conversation");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <ConversationView />
    </main>
  );
}

import { redirect } from "next/navigation";

import { CommunityView } from "@/components/social/community-view";
import { auth } from "@/lib/auth";

export default async function CommunityPage(props: PageProps<"/community">) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/community");
  }

  const searchParams = await props.searchParams;
  const sort = searchParams.sort === "popular" ? "popular" : "recent";
  const userId = typeof searchParams.userId === "string" ? searchParams.userId : "";
  const nickname = typeof searchParams.nickname === "string" ? searchParams.nickname : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <CommunityView initialSort={sort} initialUserId={userId} initialNickname={nickname} />
    </main>
  );
}

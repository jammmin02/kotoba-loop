import { redirect } from "next/navigation";

import { SearchView } from "@/components/search/search-view";
import { auth } from "@/lib/auth";

export default async function SearchPage(props: PageProps<"/search">) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/search");
  }

  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <SearchView initialQuery={q} />
    </main>
  );
}

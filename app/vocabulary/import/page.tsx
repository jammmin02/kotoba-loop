import Link from "next/link";
import { redirect } from "next/navigation";

import { ImportWizard } from "@/components/vocabulary/import/import-wizard";
import { auth } from "@/lib/auth";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "단어 가져오기 — kotoba-loop",
};

export default async function VocabularyImportPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/vocabulary/import");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">단어 가져오기</h1>
        <Link href="/vocabulary" className="text-sm font-bold text-muted hover:text-foreground">
          단어장으로 돌아가기
        </Link>
      </div>
      <ImportWizard />
    </main>
  );
}

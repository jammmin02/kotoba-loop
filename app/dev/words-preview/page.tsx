import { notFound } from "next/navigation";

import { WordsPreview } from "@/app/dev/words-preview/words-preview";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Words Preview — kotoba-loop (dev)",
  robots: { index: false, follow: false },
};

/**
 * 단어 목록(`WordsView`)을 로그인/DB 없이 대량 데이터로 확인하는 개발용 화면. API 응답만 가짜 데이터로
 * 대체하고 컴포넌트는 실제 그대로 쓴다. `?count=3000`으로 개수를, `?mode=baseline`으로 "전부 한 번에
 * 렌더"하던 이전 방식을 재현해 성능을 비교할 수 있다.
 */
export default async function WordsPreviewPage(props: PageProps<"/dev/words-preview">) {
  if (process.env.NODE_ENV === "production") notFound();

  const searchParams = await props.searchParams;
  const rawCount = typeof searchParams.count === "string" ? Number(searchParams.count) : NaN;
  const count = Number.isInteger(rawCount) && rawCount > 0 ? Math.min(rawCount, 20000) : 3000;
  const baseline = searchParams.mode === "baseline";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <WordsPreview count={count} baseline={baseline} />
    </main>
  );
}

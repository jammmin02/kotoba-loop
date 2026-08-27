import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SrsTestPanel } from "@/app/dev/srs-test/srs-test-panel";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SRS Test — kotoba-loop (dev)",
  robots: { index: false, follow: false },
};

export default async function SrsTestPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dev/srs-test");
  }

  const userVocabularies = await db.userVocabulary.findMany({
    where: { user_id: session.user.id },
    include: { vocabulary: { select: { word: true, reading: true } } },
    orderBy: { vocabulary: { word: "asc" } },
    take: 50,
  });

  const words = userVocabularies.map((uv) => ({
    vocabularyId: uv.vocabulary_id,
    word: uv.vocabulary.word,
    reading: uv.vocabulary.reading,
    learningStatus: uv.learning_status,
    intervalStage: uv.interval_stage,
    correctCount: uv.correct_count,
    wrongCount: uv.wrong_count,
    nextReviewAt: uv.next_review_at ? uv.next_review_at.toISOString() : null,
    lastReviewedAt: uv.last_reviewed_at ? uv.last_reviewed_at.toISOString() : null,
  }));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-bold text-foreground">SRS 엔진 테스트</h1>
        <p className="mt-2 text-sm text-foreground/70">
          개발 전용 페이지입니다. 프로덕션 빌드에서는 404로 응답합니다. 평가 버튼을 누르면{" "}
          <code>POST /api/user-vocabulary/:id/review-result</code> 응답을 그대로 확인할 수 있습니다.
        </p>
      </header>

      {words.length === 0 ? (
        <p className="text-sm text-foreground/60">
          등록된 단어가 없습니다. 먼저{" "}
          <Link href="/words/new" className="underline">
            단어를 등록
          </Link>
          해주세요.
        </p>
      ) : (
        <SrsTestPanel words={words} />
      )}
    </main>
  );
}

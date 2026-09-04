import { notFound, redirect } from "next/navigation";

import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import type { VocabularyDetail } from "@/types/vocabulary";

export default async function EditWordPage(props: PageProps<"/words/[id]/edit">) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await props.params;
  const userVocabulary = await db.userVocabulary.findUnique({
    where: { user_id_vocabulary_id: { user_id: session.user.id, vocabulary_id: id } },
  });
  if (!userVocabulary) {
    notFound();
  }

  const vocabulary = await db.vocabulary.findUnique({
    where: { id },
    include: {
      meanings: true,
      examples: true,
      relatedExpressions: { orderBy: { order: "asc" } },
      bookItems: true,
      tags: { select: { tag: { select: { id: true, name: true } } } },
    },
  });
  if (!vocabulary) {
    notFound();
  }

  const initialData: VocabularyDetail = {
    id: vocabulary.id,
    word: vocabulary.word,
    reading: vocabulary.reading,
    partOfSpeech: vocabulary.part_of_speech,
    jlptLevel: vocabulary.jlpt_level,
    learningStatus: userVocabulary.learning_status,
    meanings: vocabulary.meanings.map((m) => m.meaning),
    examples: vocabulary.examples.map((e) => ({ japanese: e.japanese, korean: e.korean })),
    relatedExpressions: vocabulary.relatedExpressions.map((related) => ({
      id: related.id,
      relationType: related.relation_type,
      expression: related.expression,
      meaning: related.meaning,
    })),
    bookIds: vocabulary.bookItems.map((item) => item.vocabulary_book_id),
    isFavorite: userVocabulary.is_favorite,
    tags: vocabulary.tags.map((t) => t.tag),
    createdAt: formatKstISOString(vocabulary.created_at),
    lastReviewedAt: userVocabulary.last_reviewed_at
      ? formatKstISOString(userVocabulary.last_reviewed_at)
      : null,
    nextReviewAt: userVocabulary.next_review_at
      ? formatKstISOString(userVocabulary.next_review_at)
      : null,
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-xl font-bold text-foreground">단어 수정</h1>
      <VocabularyForm initialData={initialData} />
    </main>
  );
}

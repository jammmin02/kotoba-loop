import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PixelBookOpen, PixelPlus } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BookEmblem,
  BookProgressGauge,
  BookSlotTitleBar,
  VisibilityChip,
} from "@/components/vocabulary/book-slot";
import { WordListItem } from "@/components/vocabulary/word-list-item";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import type { VocabularySummary } from "@/types/vocabulary";

export default async function VocabularyBookDetailPage(props: PageProps<"/vocabulary/[id]">) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await props.params;
  const book = await db.vocabularyBook.findUnique({
    where: { id },
    include: { _count: { select: { items: true } } },
  });

  if (!book || book.user_id !== session.user.id) {
    notFound();
  }

  const words = await db.vocabulary.findMany({
    where: { bookItems: { some: { vocabulary_book_id: id } } },
    orderBy: { created_at: "desc" },
    include: {
      meanings: { select: { meaning: true } },
      userVocabularies: {
        where: { user_id: session.user.id },
        select: { learning_status: true, is_favorite: true },
      },
      tags: { select: { tag: { select: { id: true, name: true } } } },
    },
  });

  const wordSummaries: VocabularySummary[] = words.map((word) => ({
    id: word.id,
    word: word.word,
    reading: word.reading,
    partOfSpeech: word.part_of_speech,
    jlptLevel: word.jlpt_level,
    learningStatus: word.userVocabularies[0]?.learning_status ?? "NEW",
    meanings: word.meanings.map((m) => m.meaning),
    bookIds: [id],
    isFavorite: word.userVocabularies[0]?.is_favorite ?? false,
    tags: word.tags.map((t) => t.tag),
    createdAt: formatKstISOString(word.created_at),
  }));

  const addWordHref = `/words/new?bookId=${id}`;
  const wordCount = book._count.items;
  const masteredCount = wordSummaries.filter((word) => word.learningStatus === "MASTERED").length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/vocabulary"
        className="text-sm font-bold text-foreground/60 hover:text-foreground"
      >
        ← 단어장 목록
      </Link>

      <div className="overflow-hidden rounded-none border-2 border-pixel-ink bg-surface shadow-pixel-lg">
        <BookSlotTitleBar color="mint">
          <VisibilityChip isPublic={book.is_public} />
        </BookSlotTitleBar>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <BookEmblem color="mint" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-foreground">{book.name}</h1>
              {book.description && (
                <p className="font-content text-sm text-foreground/70">{book.description}</p>
              )}
            </div>
          </div>
          <BookProgressGauge masteredCount={masteredCount} wordCount={wordCount} />
          <p className="text-xs text-foreground/50">
            완료 {masteredCount}개 · 단어 {wordCount}개
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-foreground/70">단어 목록</h2>
        <Link href={addWordHref}>
          <Button type="button" size="sm">
            <PixelPlus className="size-3.5" aria-hidden="true" />
            단어 추가
          </Button>
        </Link>
      </div>

      {wordSummaries.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <PixelBookOpen className="size-12 text-foreground/30" aria-hidden="true" />
          <p className="text-sm font-bold text-foreground">아직 등록된 단어가 없어요</p>
          <p className="text-xs font-content text-foreground/50">
            이 단어장에 첫 단어를 추가해보세요.
          </p>
          <Link href={addWordHref}>
            <Button type="button" size="sm">
              <PixelPlus className="size-3.5" aria-hidden="true" />
              단어 추가
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {wordSummaries.map((word) => (
            <WordListItem key={word.id} word={word} />
          ))}
        </div>
      )}
    </main>
  );
}

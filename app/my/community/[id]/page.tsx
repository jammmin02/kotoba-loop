import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PixelBookOpen } from "@/components/icons/pixel-icons";
import { ImportBookButton } from "@/components/social/import-book-button";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";

export default async function CommunityBookDetailPage(props: PageProps<"/my/community/[id]">) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await props.params;
  const book = await db.vocabularyBook.findUnique({
    where: { id },
    include: {
      user: { select: { nickname: true } },
      _count: { select: { items: true } },
    },
  });

  if (!book || (!book.is_public && book.user_id !== session.user.id)) {
    notFound();
  }

  const words = await db.vocabulary.findMany({
    where: { bookItems: { some: { vocabulary_book_id: id } } },
    orderBy: { created_at: "desc" },
    include: { meanings: { select: { meaning: true } } },
  });

  const isOwner = book.user_id === session.user.id;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/my/community"
        className="text-sm font-bold text-foreground/60 hover:text-foreground"
      >
        ← 커뮤니티 단어장
      </Link>

      <Card variant="elevated" title="COMMUNITY.EXE" titleColor="mint" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-foreground">{book.name}</h1>
          {!isOwner && <ImportBookButton bookId={book.id} />}
        </div>
        <p className="text-xs text-foreground/50">{book.user.nickname}</p>
        {book.description && (
          <p className="font-content text-sm text-foreground/70">{book.description}</p>
        )}
        <p className="text-xs text-foreground/50">
          단어 {book._count.items}개 · 가져감 {book.import_count}회 · {formatKstISOString(book.created_at).slice(0, 10)}
        </p>
      </Card>

      <h2 className="text-sm font-bold text-foreground/70">단어 목록</h2>

      {words.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <PixelBookOpen className="size-12 text-foreground/30" aria-hidden="true" />
          <p className="text-sm font-bold text-foreground">아직 등록된 단어가 없어요</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {words.map((word) => (
            <Card key={word.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-jp text-base font-bold text-foreground">{word.word}</p>
                <p className="text-xs text-foreground/50">{word.reading}</p>
              </div>
              <p className="truncate text-right text-sm font-content text-foreground/70">
                {word.meanings.map((m) => m.meaning).join(", ")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

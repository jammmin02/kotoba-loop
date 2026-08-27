import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { JlptBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteWordButton } from "@/components/vocabulary/delete-word-button";
import { FavoriteButton } from "@/components/vocabulary/favorite-button";
import { SentencePracticeCard } from "@/components/vocabulary/sentence-practice-card";
import { SituationExampleGenerator } from "@/components/vocabulary/situation-example-generator";
import { WordTagEditor } from "@/components/vocabulary/word-tag-editor";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";

function formatDate(date: Date) {
  return formatKstISOString(date).slice(0, 10).replaceAll("-", ".");
}

export default async function WordDetailPage(props: PageProps<"/words/[id]">) {
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
      tags: {
        select: { tag: { select: { id: true, name: true } } },
        orderBy: { tag: { name: "asc" } },
      },
      kanji: { select: { kanji: { select: { character: true } } } },
    },
  });
  if (!vocabulary) {
    notFound();
  }

  const tags = vocabulary.tags.map((t) => t.tag);
  // 단어에 포함된 문자 중 常用漢字로 연결된 것만 한자 상세로 이동하는 링크로 만든다(계획서
  // 30장 — 見逃す의 見/逃처럼, 히라가나 등 나머지 문자는 그대로 텍스트로 남긴다).
  const kanjiCharacters = new Set(vocabulary.kanji.map((k) => k.kanji.character));

  const userSentence = await db.userSentence.findUnique({
    where: { user_id_vocabulary_id: { user_id: session.user.id, vocabulary_id: id } },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-2">
        <Link href="/words" className="text-sm font-bold text-foreground/60 hover:text-foreground">
          ← 단어 목록
        </Link>
        <div className="flex gap-2">
          <Link href={`/words/${id}/edit`}>
            <Button type="button" variant="outline" size="sm">
              수정
            </Button>
          </Link>
          <DeleteWordButton id={id} word={vocabulary.word} />
        </div>
      </div>

      <Card variant="elevated" title="WORD.EXE" titleColor="mint" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-start gap-2">
            <FavoriteButton
              vocabularyId={id}
              isFavorite={userVocabulary.is_favorite}
              className="mt-1"
            />
            <div>
              <p className="font-jp text-3xl font-bold text-foreground">
                {Array.from(vocabulary.word).map((char, index) =>
                  kanjiCharacters.has(char) ? (
                    <Link
                      key={index}
                      href={`/kanji/${encodeURIComponent(char)}`}
                      className="hover:text-primary hover:underline"
                    >
                      {char}
                    </Link>
                  ) : (
                    <span key={index}>{char}</span>
                  ),
                )}
              </p>
              <p className="font-jp text-lg text-foreground/60">{vocabulary.reading}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={userVocabulary.learning_status} />
            {vocabulary.jlpt_level && <JlptBadge level={vocabulary.jlpt_level} />}
          </div>
        </div>

        <span className="w-fit border-2 border-pixel-ink bg-surface px-2 py-0.5 text-xs font-bold text-foreground/60">
          {vocabulary.part_of_speech}
        </span>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-sm font-bold text-foreground/70">뜻</h2>
          <ul className="flex flex-col gap-1">
            {vocabulary.meanings.map((meaning) => (
              <li key={meaning.id} className="font-content text-foreground">
                · {meaning.meaning}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-sm font-bold text-foreground/70">태그</h2>
          <WordTagEditor vocabularyId={id} initialTags={tags} />
        </div>

        <div className="grid grid-cols-2 gap-4 border-t-2 border-pixel-ink pt-4 text-sm">
          <div>
            <p className="text-xs font-bold text-foreground/50">마지막 학습</p>
            <p className="text-foreground">
              {userVocabulary.last_reviewed_at ? formatDate(userVocabulary.last_reviewed_at) : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-foreground/50">다음 복습</p>
            <p className="text-foreground">
              {userVocabulary.next_review_at ? formatDate(userVocabulary.next_review_at) : "-"}
            </p>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-foreground/70">예문</h2>
        {vocabulary.examples.length === 0 ? (
          <p className="text-sm text-foreground/50">등록된 예문이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {vocabulary.examples.map((example) => (
              <li key={example.id} className="border-2 border-pixel-ink bg-background p-3">
                {example.source && (
                  <span className="mb-1 inline-block border-2 border-pixel-ink bg-surface px-2 py-0.5 text-xs font-bold text-foreground/60">
                    {example.source}
                  </span>
                )}
                <p className="font-jp text-foreground">{example.japanese}</p>
                <p className="font-content text-sm text-foreground/60">{example.korean}</p>
              </li>
            ))}
          </ul>
        )}

        <SituationExampleGenerator vocabularyId={id} />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-foreground/70">문장 만들기</h2>
        <SentencePracticeCard vocabularyId={id} initialSentence={userSentence?.sentence ?? null} />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-foreground/70">관련 표현</h2>
        <p className="text-sm text-foreground/50">관련 표현 정보가 아직 없어요.</p>
      </Card>
    </main>
  );
}

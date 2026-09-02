import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { KanjiMnemonicCard } from "@/components/kanji/kanji-mnemonic-card";
import { KanjiReadingList } from "@/components/kanji/kanji-reading-list";
import { KanjiRepresentativeWordItem } from "@/components/kanji/kanji-representative-word-item";
import type { KanjiRepresentativeWord } from "@/components/kanji/kanji-representative-word-item";
import { KanjiStrokeOrderCard } from "@/components/kanji/kanji-stroke-order-card";
import { JlptBadge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WordListItem } from "@/components/vocabulary/word-list-item";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { formatSchoolGrade } from "@/lib/kanji";
import type { VocabularySummary } from "@/types/vocabulary";

const REPRESENTATIVE_WORD_LIMIT = 6;

export default async function KanjiDetailPage(props: PageProps<"/kanji/[character]">) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // 동적 세그먼트의 params는 라우트 핸들러(RouteContext)와 달리 percent-encoding이 그대로
  // 남아있어(예: "見" → "%E8%A6%8B") 직접 decodeURIComponent로 풀어줘야 한다 — 이미 디코딩된
  // 값이 들어와도 "%"가 없으면 그대로 반환되므로 항상 안전하다.
  const { character: rawCharacter } = await props.params;
  const character = decodeURIComponent(rawCharacter);
  const kanji = await db.kanji.findUnique({ where: { character } });
  if (!kanji) {
    notFound();
  }

  const userKanji = await db.userKanji.findUnique({
    where: { user_id_kanji_id: { user_id: session.user.id, kanji_id: kanji.id } },
  });

  const [representativeVocabularies, relatedVocabularies] = await Promise.all([
    // DB에 등록된 대표 단어 — 사용자 단어장 등록 여부와 무관하게 이 한자를 포함한 단어를 보여준다.
    db.vocabulary.findMany({
      where: { kanji: { some: { kanji_id: kanji.id } } },
      orderBy: [{ jlpt_level: "asc" }, { word: "asc" }],
      take: REPRESENTATIVE_WORD_LIMIT,
      include: { meanings: { select: { meaning: true } } },
    }),
    // 내 단어장에 등록한 단어 중 이 한자를 포함한 단어.
    db.vocabulary.findMany({
      where: {
        kanji: { some: { kanji_id: kanji.id } },
        userVocabularies: { some: { user_id: session.user.id } },
      },
      orderBy: { created_at: "desc" },
      include: {
        meanings: { select: { meaning: true } },
        userVocabularies: {
          where: { user_id: session.user.id },
          select: { learning_status: true, is_favorite: true },
        },
        bookItems: { select: { vocabulary_book_id: true } },
        tags: { select: { tag: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  const ownedVocabularyIds = new Set(relatedVocabularies.map((word) => word.id));

  const representativeWords: KanjiRepresentativeWord[] = representativeVocabularies.map((word) => ({
    id: word.id,
    word: word.word,
    reading: word.reading,
    meanings: word.meanings.map((m) => m.meaning),
    jlptLevel: word.jlpt_level,
  }));

  const words: VocabularySummary[] = relatedVocabularies.map((word) => ({
    id: word.id,
    word: word.word,
    reading: word.reading,
    partOfSpeech: word.part_of_speech,
    jlptLevel: word.jlpt_level,
    learningStatus: word.userVocabularies[0]?.learning_status ?? "NEW",
    meanings: word.meanings.map((m) => m.meaning),
    bookIds: word.bookItems.map((item) => item.vocabulary_book_id),
    isFavorite: word.userVocabularies[0]?.is_favorite ?? false,
    tags: word.tags.map((t) => t.tag),
    createdAt: formatKstISOString(word.created_at),
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/kanji" className="text-sm font-bold text-foreground/60 hover:text-foreground">
        ← 한자 목록
      </Link>

      <Card variant="elevated" title="KANJI.EXE" titleColor="mint" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="font-jp text-6xl font-bold text-foreground">{kanji.character}</p>
          <div className="flex gap-2">
            <StatusBadge status={userKanji?.learning_status ?? "NEW"} />
            {kanji.jlpt_level_ref && <JlptBadge level={kanji.jlpt_level_ref} />}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t-2 border-pixel-ink pt-4 text-sm">
          <div className="col-span-2">
            <dt className="text-xs font-bold text-foreground/50">음독</dt>
            <dd>
              <KanjiReadingList readings={kanji.onyomi} />
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-bold text-foreground/50">훈독</dt>
            <dd>
              <KanjiReadingList readings={kanji.kunyomi} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-foreground/50">한국 한자음</dt>
            <dd className="text-foreground">{kanji.korean_reading}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-foreground/50">획수</dt>
            <dd className="text-foreground">{kanji.stroke_count}획</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-foreground/50">부수</dt>
            <dd className="font-jp text-foreground">{kanji.radical}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-foreground/50">학년</dt>
            <dd className="text-foreground">{formatSchoolGrade(kanji.school_grade)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-bold text-foreground/50">뜻</dt>
            <dd className="font-content text-foreground">{kanji.meaning}</dd>
          </div>
        </dl>
      </Card>

      <KanjiStrokeOrderCard key={kanji.character} character={kanji.character} />

      <KanjiMnemonicCard character={kanji.character} />

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-foreground/70">대표 단어</h2>
        {representativeWords.length === 0 ? (
          <p className="text-sm text-foreground/50">이 한자를 포함한 단어가 아직 없어요.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {representativeWords.map((word) => (
              <KanjiRepresentativeWordItem
                key={word.id}
                word={word}
                isOwned={ownedVocabularyIds.has(word.id)}
              />
            ))}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-foreground/70">내 단어장에 등록한 단어</h2>
        {words.length === 0 ? (
          <p className="text-sm text-foreground/50">아직 등록된 관련 단어가 없어요.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {words.map((word) => (
              <WordListItem key={word.id} word={word} />
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}

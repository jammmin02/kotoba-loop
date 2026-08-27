import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import type { VocabularySummary } from "@/types/vocabulary";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/kanji/[character]/vocabularies">,
  ): Promise<VocabularySummary[]> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { character: rawCharacter } = await ctx.params;
    const character = decodeURIComponent(rawCharacter);
    const kanji = await db.kanji.findUnique({ where: { character } });
    if (!kanji) {
      throw new ApiError("NOT_FOUND", "존재하지 않는 한자입니다.");
    }

    const vocabularies = await db.vocabulary.findMany({
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
    });

    return vocabularies.map((vocabulary) => ({
      id: vocabulary.id,
      word: vocabulary.word,
      reading: vocabulary.reading,
      partOfSpeech: vocabulary.part_of_speech,
      jlptLevel: vocabulary.jlpt_level,
      learningStatus: vocabulary.userVocabularies[0]?.learning_status ?? "NEW",
      meanings: vocabulary.meanings.map((m) => m.meaning),
      bookIds: vocabulary.bookItems.map((item) => item.vocabulary_book_id),
      isFavorite: vocabulary.userVocabularies[0]?.is_favorite ?? false,
      tags: vocabulary.tags.map((t) => t.tag),
      createdAt: formatKstISOString(vocabulary.created_at),
    }));
  },
);

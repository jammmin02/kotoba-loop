import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { KanjiDetail } from "@/types/kanji";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/kanji/[character]">,
  ): Promise<KanjiDetail> => {
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

    const userKanji = await db.userKanji.findUnique({
      where: { user_id_kanji_id: { user_id: session.user.id, kanji_id: kanji.id } },
    });

    return {
      character: kanji.character,
      onyomi: kanji.onyomi,
      kunyomi: kanji.kunyomi,
      koreanReading: kanji.korean_reading,
      meaning: kanji.meaning,
      strokeCount: kanji.stroke_count,
      radical: kanji.radical,
      schoolGrade: kanji.school_grade,
      jlptLevelRef: kanji.jlpt_level_ref,
      learningStatus: userKanji?.learning_status ?? "NEW",
    };
  },
);

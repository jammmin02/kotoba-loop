import { generateKanjiMnemonic } from "@/lib/ai/kanji-mnemonic";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kanjiMnemonicRequestSchema } from "@/lib/validations/ai";
import type { KanjiMnemonicResponse } from "@/types/kanji";

import type { NextRequest } from "next/server";

/**
 * PROMPT 48(계획서 43장) — "AI 기억법 보기" 버튼이 호출하는 엔드포인트. 캐시가 있으면 그대로
 * 재사용하고, 클라이언트가 `regenerate: true`를 보낼 때만(사용자가 명시적으로 "다시 생성"을
 * 눌렀을 때만) 캐시를 지우고 새로 호출한다.
 */
export const POST = withApiHandler(
  async (
    req: NextRequest,
    ctx: RouteContext<"/api/kanji/[character]/mnemonic">,
  ): Promise<KanjiMnemonicResponse> => {
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

    const body = await req.json().catch(() => ({}));
    const { regenerate } = kanjiMnemonicRequestSchema.parse(body);

    const { cached, result } = await generateKanjiMnemonic(
      session.user.id,
      kanji.id,
      {
        character: kanji.character,
        radical: kanji.radical,
        meaning: kanji.meaning,
        onyomi: kanji.onyomi,
        kunyomi: kanji.kunyomi,
        strokeCount: kanji.stroke_count,
      },
      { forceRegenerate: regenerate },
    );

    return { cached, mnemonic: result.mnemonic };
  },
);

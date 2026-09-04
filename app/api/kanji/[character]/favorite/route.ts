import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

import type { NextRequest } from "next/server";

async function setFavorite(
  ctx: RouteContext<"/api/kanji/[character]/favorite">,
  isFavorite: boolean,
): Promise<{ character: string; isFavorite: boolean }> {
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

  // UserKanji는 첫 리뷰 전까지 행이 없을 수 있다(PROMPT 35) — 즐겨찾기만 켜는 경우에도
  // 기본 SRS 상태로 행을 먼저 만든다. lib/study/queries.ts의 getTodayKanjiQueue는 "신규"
  // 판정을 행 존재 여부가 아니라 learning_status로 보므로 오늘의 학습 큐에는 영향이 없다.
  await db.userKanji.upsert({
    where: { user_id_kanji_id: { user_id: session.user.id, kanji_id: kanji.id } },
    create: { user_id: session.user.id, kanji_id: kanji.id, is_favorite: isFavorite },
    update: { is_favorite: isFavorite },
  });

  return { character, isFavorite };
}

export const POST = withApiHandler(
  (_req: NextRequest, ctx: RouteContext<"/api/kanji/[character]/favorite">) =>
    setFavorite(ctx, true),
);

export const DELETE = withApiHandler(
  (_req: NextRequest, ctx: RouteContext<"/api/kanji/[character]/favorite">) =>
    setFavorite(ctx, false),
);

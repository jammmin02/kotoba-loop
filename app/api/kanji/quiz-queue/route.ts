import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseTodayTargetOverrides } from "@/lib/study/plan-overrides";
import { getTodayKanjiQueue } from "@/lib/study/queries";
import type { KanjiQuizQueueResponse } from "@/types/kanji";

import type { NextRequest } from "next/server";

/**
 * "오늘의 한자"(PROMPT 36) 대상 id 목록 — `GET /api/study/queue`(단어)의 한자 버전. 신규/복습/
 * 취약을 구분하지 않고 하나의 목록으로 합쳐 반환한다. 유형 배정은 `POST /api/quiz/session`이
 * 전부 균등하게 처리하므로, 여기서는 "오늘 풀어야 할 한자가 무엇인지"만 알려주면 된다.
 */
export const GET = withApiHandler(async (req: NextRequest): Promise<KanjiQuizQueueResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { kanjiTarget } = parseTodayTargetOverrides(req.nextUrl.searchParams);
  const { newKanjiIds, reviewKanjiIds, weakKanjiIds } = await getTodayKanjiQueue(
    session.user.id,
    new Date(),
    db,
    kanjiTarget,
  );

  return { kanjiIds: [...newKanjiIds, ...reviewKanjiIds, ...weakKanjiIds] };
});

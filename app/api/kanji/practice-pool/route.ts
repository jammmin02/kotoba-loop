import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { matchesKanjiQuery } from "@/lib/kanji/search";
import { normalizeSearchQuery } from "@/lib/search";
import { kanjiPracticePoolQuerySchema } from "@/lib/validations/kanji";
import type { KanjiPracticePoolResponse } from "@/types/kanji";

import type { NextRequest } from "next/server";

/**
 * 한자 퀴즈 연습 모드(전체 랜덤/학년·JLPT/커스텀, `components/kanji/kanji-practice-view.tsx`)의
 * 재료 목록 — `GET /api/kanji`와 달리 페이지네이션이 없고(셔플/전체 선택에 전량이 필요) `id`와
 * 요청자 기준 `isFavorite`를 포함한다. `GET /api/kanji/quiz-queue`(오늘의 한자 SRS 큐)와는
 * 별개 트랙이라 여기서 뽑은 id로 푸는 퀴즈도 `POST /api/quiz/submit`을 그대로 타고 학습 상태에
 * 반영된다 — SRS 일정과 분리된 "순수 연습" 모드는 아직 없다.
 *
 * 대신 `seenOnly`(전체 랜덤/학년·JLPT 모드 전용)로, 한 번도 리뷰하지 않은 한자가 무작위로
 * 뽑혀 `DAILY_KANJI_TARGET` 페이싱을 건너뛰고 SRS 추적을 시작해버리는 것만 막는다 — 커스텀
 * 모드는 사용자가 의도적으로 고르는 것이라 이 제한 없이 전체에서 검색/선택할 수 있다.
 */
export const GET = withApiHandler(
  async (req: NextRequest): Promise<KanjiPracticePoolResponse> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { q, grade, jlpt, favoritesOnly, seenOnly } = kanjiPracticePoolQuerySchema.parse({
      q: req.nextUrl.searchParams.get("q") ?? undefined,
      grade: req.nextUrl.searchParams.get("grade") ?? undefined,
      jlpt: req.nextUrl.searchParams.get("jlpt") ?? undefined,
      favoritesOnly: req.nextUrl.searchParams.get("favoritesOnly") ?? undefined,
      seenOnly: req.nextUrl.searchParams.get("seenOnly") ?? undefined,
    });

    const [rows, userKanjiRows] = await Promise.all([
      db.kanji.findMany({
        where: {
          ...(grade !== undefined && { school_grade: grade }),
          ...(jlpt !== undefined && { jlpt_level_ref: jlpt }),
        },
        orderBy: [{ school_grade: "asc" }, { stroke_count: "asc" }, { character: "asc" }],
        select: {
          id: true,
          character: true,
          onyomi: true,
          kunyomi: true,
          korean_reading: true,
          meaning: true,
          school_grade: true,
          jlpt_level_ref: true,
        },
      }),
      db.userKanji.findMany({
        where: { user_id: session.user.id },
        select: { kanji_id: true, is_favorite: true, learning_status: true },
      }),
    ]);

    const favoriteIds = new Set(
      userKanjiRows.filter((row) => row.is_favorite).map((row) => row.kanji_id),
    );
    // 즐겨찾기만 해두고 아직 리뷰하지 않은 한자(learning_status "NEW")는 `seenOnly` 기준으로
    // "이미 등장한 적 있는 한자"가 아니다 — 실제로 한 번이라도 채점된 적 있어야 포함한다.
    const seenIds = new Set(
      userKanjiRows.filter((row) => row.learning_status !== "NEW").map((row) => row.kanji_id),
    );
    const normalizedQuery = q ? normalizeSearchQuery(q) : "";

    const items = rows
      .filter((row) => !seenOnly || seenIds.has(row.id))
      .filter((row) => !favoritesOnly || favoriteIds.has(row.id))
      .filter((row) => !normalizedQuery || matchesKanjiQuery(row, normalizedQuery))
      .map((row) => ({
        id: row.id,
        character: row.character,
        koreanReading: row.korean_reading,
        meaning: row.meaning,
        schoolGrade: row.school_grade,
        jlptLevelRef: row.jlpt_level_ref,
        isFavorite: favoriteIds.has(row.id),
      }));

    return { items };
  },
);

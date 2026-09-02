import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { EXP_REWARDS } from "@/lib/game/constants";
import { grantActionExp } from "@/lib/game/grant";
import { Prisma } from "@/lib/generated/prisma/client";
import { QUEST_CODES } from "@/lib/quest/constants";
import { FLASHCARD_REVIEW_HISTORY_QUIZ_TYPE } from "@/lib/srs/constants";
import { isCorrectGrade } from "@/lib/srs/engine";
import { persistTargetReview } from "@/lib/srs/target";
import type { LearningStatus } from "@/lib/srs/types";
import { reviewResultSchema } from "@/lib/validations/srs";
import { requireOwnedVocabulary } from "@/lib/vocabulary-ownership";
import type { GameProfileGain } from "@/types/game";

import type { NextRequest } from "next/server";

export interface ReviewResultResponse {
  vocabularyId: string;
  learningStatus: LearningStatus;
  intervalStage: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string;
  nextReviewAt: string;
  gameProfile: GameProfileGain;
}

/**
 * 이미 처리된 채점을 재시도로 다시 받았을 때(타임아웃 후 클라이언트가 같은 requestId로
 * 재전송하거나 사용자가 같은 카드에 다시 채점 버튼을 눌렀을 때), EXP/SRS를 다시 반영하지
 * 않고 현재 상태만 그대로 돌려준다. app/api/quiz/submit/route.ts의 buildReplayResponse와
 * 동일한 목적 — 여기서는 대상이 항상 단어(vocab)라 조회가 더 단순하다.
 */
async function buildReplayResponse(
  userId: string,
  vocabularyId: string,
): Promise<ReviewResultResponse> {
  const [userVocabulary, gameProfile] = await Promise.all([
    db.userVocabulary.findUniqueOrThrow({
      where: { user_id_vocabulary_id: { user_id: userId, vocabulary_id: vocabularyId } },
    }),
    db.userGameProfile.findUniqueOrThrow({ where: { user_id: userId } }),
  ]);

  return {
    vocabularyId,
    learningStatus: userVocabulary.learning_status,
    intervalStage: userVocabulary.interval_stage,
    correctCount: userVocabulary.correct_count,
    wrongCount: userVocabulary.wrong_count,
    lastReviewedAt: formatKstISOString(userVocabulary.last_reviewed_at ?? new Date()),
    nextReviewAt: formatKstISOString(userVocabulary.next_review_at ?? new Date()),
    gameProfile: {
      expGained: 0,
      level: gameProfile.level,
      exp: gameProfile.exp,
      leveledUp: false,
      completedQuestCodes: [],
      unlockedAchievements: [],
      petGrowth: null,
    },
  };
}

export const POST = withApiHandler(
  async (
    req: NextRequest,
    ctx: RouteContext<"/api/user-vocabulary/[id]/review-result">,
  ): Promise<ReviewResultResponse> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const { id } = await ctx.params;

    const body = await req.json();
    const { grade, requestId } = reviewResultSchema.parse(body);

    const now = new Date();
    const userId = session.user.id;

    const alreadyProcessed = await db.reviewHistory.findUnique({
      where: { request_id: requestId },
    });
    if (alreadyProcessed) {
      return buildReplayResponse(userId, id);
    }

    let result: {
      update: Awaited<ReturnType<typeof persistTargetReview>>;
      gameProfile: GameProfileGain;
    };
    try {
      result = await db.$transaction(async (tx) => {
        const userVocabulary = await requireOwnedVocabulary(id, userId, tx);
        const wasNew = userVocabulary.learning_status === "NEW";
        const wasWeak = userVocabulary.learning_status === "WEAK";

        const update = await persistTargetReview(
          tx,
          "vocab",
          userId,
          id,
          userVocabulary,
          grade,
          now,
        );

        // 퀴즈(PROMPT 20)와 동일하게 ReviewHistory에 남겨야 오답노트(PROMPT 21)가 플래시카드
        // 오답도 함께 집계한다 — 그렇지 않으면 "오답 복습" 개수(learning_status=WEAK)와
        // 오답노트(ReviewHistory 집계)가 서로 다른 데이터를 봐서 어긋난다.
        //
        // request_id도 함께 남겨(quiz/submit과 동일한 유니크 제약) 타임아웃 후 재시도가 EXP/SRS를
        // 이중으로 반영하지 않도록 막는다(카드 1장 재채점 = review-result 1회 호출, 재시도 시
        // 클라이언트가 같은 카드에 대해 같은 requestId를 재사용한다).
        await tx.reviewHistory.create({
          data: {
            user_id: userId,
            target_type: "vocab",
            target_id: id,
            quiz_type: FLASHCARD_REVIEW_HISTORY_QUIZ_TYPE,
            result: isCorrectGrade(grade),
            response_time: 0,
            reviewed_at: now,
            request_id: requestId,
          },
        });

        // 게임화(PROMPT 24): 처음 배우는 단어면 "단어 학습", 이미 배운 단어면 "복습 성공"
        // 시에만(오답 제외) EXP를 지급한다. 완료 보너스 체크는 `grantActionExp` 내부에서
        // 정답/오답과 무관하게 항상 수행된다.
        const actionExp = wasNew
          ? EXP_REWARDS.WORD_STUDY
          : isCorrectGrade(grade)
            ? EXP_REWARDS.REVIEW_SUCCESS
            : 0;
        // Daily Quest(PROMPT 25): "새 단어 학습"/"복습 완료"는 위 EXP 조건과 각각 그대로
        // 대응되고(둘은 상호 배타적), "오답 문제 재도전"은 채점 전 상태가 WEAK였다는 사실
        // 자체로 정답/오답과 무관하게 진행된다.
        const gameProfile = await grantActionExp(
          tx,
          userId,
          actionExp,
          now,
          {
            [QUEST_CODES.NEW_WORD_STUDY]: wasNew ? 1 : 0,
            [QUEST_CODES.REVIEW_COMPLETE]: !wasNew && isCorrectGrade(grade) ? 1 : 0,
            [QUEST_CODES.WEAK_RETRY]: wasWeak ? 1 : 0,
          },
          // 업적(PROMPT 27): "N단어 학습"은 이 단어가 방금 NEW를 벗어났을 때만 카운트가 바뀌므로
          // wasNew일 때만 체크한다(플래시카드가 학습 상태 전이가 일어나는 유일한 지점이다).
          { checkWordStudyAchievement: wasNew },
        );

        return { update, gameProfile };
      });
    } catch (err) {
      // 사전 조회(위 alreadyProcessed) 이후, 이 트랜잭션 커밋 이전 사이의 아주 좁은 틈으로 같은
      // requestId의 두 번째 요청이 들어오면 request_id 유니크 제약에서 걸린다 — quiz/submit과
      // 동일한 처리: 이미 다른 요청이 커밋을 마쳤다는 뜻이므로 현재 상태를 그대로 재구성해 돌려준다.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return buildReplayResponse(userId, id);
      }
      throw err;
    }

    const { update, gameProfile } = result;
    return {
      vocabularyId: id,
      learningStatus: update.learningStatus,
      intervalStage: update.intervalStage,
      correctCount: update.correctCount,
      wrongCount: update.wrongCount,
      lastReviewedAt: formatKstISOString(now),
      nextReviewAt: formatKstISOString(update.nextReviewAt),
      gameProfile,
    };
  },
);

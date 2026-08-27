import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";
import { EXP_REWARDS } from "@/lib/game/constants";
import { grantActionExp } from "@/lib/game/grant";
import { Prisma } from "@/lib/generated/prisma/client";
import { QUEST_CODES } from "@/lib/quest/constants";
import { mapQuizResultToGrade } from "@/lib/quiz/constants";
import { gradeQuizAnswer } from "@/lib/quiz/grading";
import type { QuizTargetType } from "@/lib/quiz/types";
import { persistTargetReview } from "@/lib/srs/target";
import type { LearningStatus } from "@/lib/srs/types";
import { quizSubmitSchema } from "@/lib/validations/quiz";
import { requireOwnedVocabulary } from "@/lib/vocabulary-ownership";
import type { QuizSubmitResponse } from "@/types/quiz";

import type { NextRequest } from "next/server";

interface CurrentTargetRow {
  interval_stage: number;
  learning_status: LearningStatus;
  correct_count: number;
  wrong_count: number;
}

/**
 * 이미 처리된 제출을 재시도로 다시 받았을 때, 아무것도 새로 지급하지 않고 현재 상태만
 * 그대로 돌려준다(PROMPT 37 통합 회귀에서 발견 — 클라이언트 타임아웃 후 자동 재시도가
 * 서버에는 이미 성공한 요청을 한 번 더 보낼 수 있는데, 그전까지는 이걸 완전히 새로운
 * 제출로 처리해 EXP/SRS/업적을 이중으로 반영했다). SRS 상태는 원 요청이 이미 반영해뒀으므로
 * 대상 행을 다시 읽기만 하면 되고, EXP는 0으로 보고해 알림/애니메이션이 다시 뜨지 않게 한다.
 */
async function buildReplayResponse(
  userId: string,
  targetType: QuizTargetType,
  targetId: string,
  isCorrect: boolean,
): Promise<QuizSubmitResponse> {
  const [row, gameProfile] = await Promise.all([
    targetType === "kanji"
      ? db.userKanji.findUniqueOrThrow({
          where: { user_id_kanji_id: { user_id: userId, kanji_id: targetId } },
        })
      : db.userVocabulary.findUniqueOrThrow({
          where: { user_id_vocabulary_id: { user_id: userId, vocabulary_id: targetId } },
        }),
    db.userGameProfile.findUniqueOrThrow({ where: { user_id: userId } }),
  ]);

  return {
    isCorrect,
    learningStatus: row.learning_status,
    nextReviewAt: formatKstISOString(row.next_review_at ?? new Date()),
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

/**
 * 채점 + ReviewHistory 기록 + SRS 갱신을 하나의 트랜잭션으로 묶는다(PROMPT 20 요구사항, PROMPT 36에서
 * `targetType`으로 한자까지 확장). 문제 1개당 1회 호출되는 설계다 — 플래시카드(PROMPT 18)의
 * "카드 1장 채점 = API 호출 1번"과 같은 단위로 맞춰서, 실패 시 그 문제 하나만 재시도하면 되게
 * 한다(세션 전체를 다시 보내지 않음).
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<QuizSubmitResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { question, userAnswer, responseTimeMs, requestId } = quizSubmitSchema.parse(
    await req.json(),
  );
  const userId = session.user.id;
  const now = new Date();
  const { targetType, targetId, quizType } = question;

  const isCorrect = gradeQuizAnswer(question, userAnswer);
  const grade = mapQuizResultToGrade(isCorrect);

  const alreadyProcessed = await db.reviewHistory.findUnique({ where: { request_id: requestId } });
  if (alreadyProcessed) {
    return buildReplayResponse(userId, targetType, targetId, alreadyProcessed.result);
  }

  let update: Awaited<ReturnType<typeof persistTargetReview>>;
  let gameProfile: QuizSubmitResponse["gameProfile"];
  try {
    ({ update, gameProfile } = await db.$transaction(async (tx) => {
      let currentRow: CurrentTargetRow | null;
      // 한자는 `UserKanji` 행이 첫 리뷰 전까지 아예 없다(PROMPT 35) — 행이 없다는 것 자체가 "이
      // 한자를 처음 학습한다"는 뜻이라 단어의 `wasNew`(learning_status === "NEW")와 동등하다.
      let wasNewKanji = false;
      let wasWeakVocabulary = false;

      if (targetType === "kanji") {
        currentRow = await tx.userKanji.findUnique({
          where: { user_id_kanji_id: { user_id: userId, kanji_id: targetId } },
        });
        wasNewKanji = currentRow === null;
      } else {
        const userVocabulary = await requireOwnedVocabulary(targetId, userId, tx);
        currentRow = userVocabulary;
        wasWeakVocabulary = userVocabulary.learning_status === "WEAK";
      }

      const result = await persistTargetReview(
        tx,
        targetType,
        userId,
        targetId,
        currentRow,
        grade,
        now,
      );

      // `request_id`에 유니크 제약이 걸려 있어, 위의 사전 조회와 이 트랜잭션 사이에 정확히 같은
      // requestId로 두 요청이 경합하면 여기서 유니크 위반으로 하나가 실패한다 — 그 경우 이미 다른
      // 요청이 같은 답을 처리 중이라는 뜻이므로, 호출자가 재시도해도 사전 조회에서 이번엔 걸린다.
      await tx.reviewHistory.create({
        data: {
          user_id: userId,
          target_type: targetType,
          target_id: targetId,
          quiz_type: quizType,
          result: isCorrect,
          response_time: responseTimeMs,
          reviewed_at: now,
          request_id: requestId,
        },
      });

      const gameProfile =
        targetType === "kanji"
          ? // 계획서 56장: 한자 학습 +2, 정답일 때만 지급한다(오답은 EXP 없음 — 기존 단어 복습
            // 퀴즈의 REVIEW_SUCCESS와 동일 취급). 업적(PROMPT 27)은 이 한자가 방금 처음
            // 학습됐을 때만 체크한다 — "N자 학습" 카운트가 그 순간에만 바뀌기 때문이다.
            // Daily Quest(PROMPT 37): "한자 복습 완료"는 단어의 REVIEW_COMPLETE와 동일하게
            // 정답 여부로만 진행된다.
            await grantActionExp(
              tx,
              userId,
              isCorrect ? EXP_REWARDS.KANJI_STUDY : 0,
              now,
              { [QUEST_CODES.KANJI_REVIEW_COMPLETE]: isCorrect ? 1 : 0 },
              { checkKanjiStudyAchievement: wasNewKanji },
            )
          : // 게임화(PROMPT 24): 퀴즈는 항상 이미 배운 단어의 복습이므로 정답일 때만 "복습 성공" EXP.
            // 완료 보너스 체크는 `grantActionExp` 내부에서 정답/오답과 무관하게 항상 수행된다.
            await grantActionExp(tx, userId, isCorrect ? EXP_REWARDS.REVIEW_SUCCESS : 0, now, {
              // Daily Quest(PROMPT 25): "복습 완료"는 REVIEW_SUCCESS EXP와 같은 조건(정답)으로
              // 진행되고, "오답 문제 재도전"은 채점 전 상태가 WEAK였던 단어를 다시 풀었다는 사실
              // 자체로 진행된다(정답/오답 무관 — "재도전"이라는 행위 기준).
              [QUEST_CODES.REVIEW_COMPLETE]: isCorrect ? 1 : 0,
              [QUEST_CODES.WEAK_RETRY]: wasWeakVocabulary ? 1 : 0,
            });

      return { update: result, gameProfile };
    }));
  } catch (err) {
    // 사전 조회(위 alreadyProcessed) 이후, 이 트랜잭션 커밋 이전 사이의 아주 좁은 틈으로 같은
    // requestId의 두 번째 요청이 들어오면 `request_id` 유니크 제약에서 걸린다 — 그 시점엔
    // 먼저 들어온 요청이 이미 커밋을 마쳤다는 뜻이므로(그렇지 않으면 Postgres가 유니크 검사를
    // 위해 블로킹했다가 그 커밋 이후에야 위반을 보고한다), 안전하게 현재 상태를 그대로 재구성해
    // 돌려줄 수 있다.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return buildReplayResponse(userId, targetType, targetId, isCorrect);
    }
    throw err;
  }

  return {
    isCorrect,
    learningStatus: update.learningStatus,
    nextReviewAt: formatKstISOString(update.nextReviewAt),
    gameProfile,
  };
});

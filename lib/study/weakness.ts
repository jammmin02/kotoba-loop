import "server-only";

import { db } from "@/lib/db";
import { QUIZ_TYPES } from "@/lib/quiz/types";
import type { QuizType } from "@/lib/quiz/types";

/** 문제 유형별 정답률 집계 한 행. */
export interface QuizTypeAccuracy {
  quizType: QuizType;
  total: number;
  correct: number;
  /** 0~100 정수(백분율). */
  accuracy: number;
}

/** AI 취약점 분석을 의미 있게 만들기 위한 최소 데이터 기준(PROMPT 38 — 신규 계정 안내 문구 기준). */
export const MIN_TOTAL_REVIEWS_FOR_WEAKNESS = 20;
export const MIN_REVIEWS_PER_TYPE_FOR_WEAKNESS = 5;
export const MIN_TYPES_FOR_WEAKNESS = 2;

/**
 * `ReviewHistory.quiz_type`별 정답률 집계. `quiz_type`은 DB 컬럼상 자유 문자열이라 플래시카드
 * 리뷰(PROMPT 18)도 별도 값("FLASHCARD", `lib/srs/constants.ts`)으로 같은 테이블에 남는다 —
 * "문제 유형별" 비교는 실제 퀴즈 유형(`QUIZ_TYPES`)에만 의미가 있으므로 여기서 걸러낸다.
 * groupBy는 `result` 조건별로 두 번(전체/정답) 나눠 돌려야 한 번의 groupBy로 조건부 count를
 * 셀 수 없는 Prisma 제약을 피한다.
 */
export async function getQuizTypeAccuracy(userId: string): Promise<QuizTypeAccuracy[]> {
  const [totals, corrects] = await Promise.all([
    db.reviewHistory.groupBy({
      by: ["quiz_type"],
      where: { user_id: userId, quiz_type: { in: [...QUIZ_TYPES] } },
      _count: { _all: true },
    }),
    db.reviewHistory.groupBy({
      by: ["quiz_type"],
      where: { user_id: userId, quiz_type: { in: [...QUIZ_TYPES] }, result: true },
      _count: { _all: true },
    }),
  ]);

  const correctByType = new Map(corrects.map((row) => [row.quiz_type, row._count._all]));

  return totals
    .map((row) => {
      const total = row._count._all;
      const correct = correctByType.get(row.quiz_type) ?? 0;
      return {
        quizType: row.quiz_type as QuizType,
        total,
        correct,
        accuracy: Math.round((correct / total) * 100),
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** AI 코멘트를 생성하기에 데이터가 충분한지 판단한다(유형 간 비교가 가능해야 하므로 2종 이상 필요). */
export function hasEnoughDataForWeakness(accuracyByType: QuizTypeAccuracy[]): boolean {
  const totalReviews = accuracyByType.reduce((sum, row) => sum + row.total, 0);
  const typesWithEnoughData = accuracyByType.filter(
    (row) => row.total >= MIN_REVIEWS_PER_TYPE_FOR_WEAKNESS,
  );
  return (
    totalReviews >= MIN_TOTAL_REVIEWS_FOR_WEAKNESS &&
    typesWithEnoughData.length >= MIN_TYPES_FOR_WEAKNESS
  );
}

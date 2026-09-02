import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { computeQuizTypeWeights, pickBoostedType } from "@/lib/quiz/distribution";
import {
  fetchKanjiPool,
  fetchQuizKanji,
  fetchQuizPool,
  fetchQuizVocabularies,
} from "@/lib/quiz/queries";
import { generateKanjiQuizSession, generateQuizSession } from "@/lib/quiz/session";
import { KANJI_QUIZ_TYPES, VOCAB_QUIZ_TYPES } from "@/lib/quiz/types";
import type { QuizType } from "@/lib/quiz/types";
import { getQuizTypeAccuracy } from "@/lib/study/weakness";
import { quizSessionRequestSchema } from "@/lib/validations/quiz";
import { requireOwnedVocabularies } from "@/lib/vocabulary-ownership";
import type { QuizSessionResponse } from "@/types/quiz";

import type { NextRequest } from "next/server";

/**
 * 문제셋 생성(PROMPT 19 `generateQuizSession` 연결, PROMPT 36에서 `targetType`으로 한자까지
 * 지원하도록 확장). 대상은 항상 클라이언트가 명시적으로 넘기는 `targetIds`다 — "오늘의 학습"
 * 복습/오답 구간(`StudySessionView`가 `/api/study/queue` 응답의 category로 미리 걸러 넘긴다)과
 * PROMPT 21 오답노트 재시험(틀린 단어 id만 넘김), PROMPT 36 "오늘의 한자"(`/api/kanji/quiz-queue`)가
 * 동일하게 이 엔드포인트를 재사용할 수 있도록, 서버가 "오늘의 버킷"을 다시 계산하지 않는다.
 *
 * PROMPT 39(계획서 36장): 유형 배정 전에 이 사용자의 문제 유형별 정답률(PROMPT 38 집계)을 조회해
 * 가중치를 계산한다 — 데이터가 부족하면 `computeQuizTypeWeights`가 null을 반환해 균등 배분으로
 * 자연히 폴백한다.
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<QuizSessionResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { targetType, targetIds, quizTypes } = quizSessionRequestSchema.parse(await req.json());
  const userId = session.user.id;

  const kanjiTypeSet: readonly QuizType[] = KANJI_QUIZ_TYPES;
  const vocabTypeSet: readonly QuizType[] = VOCAB_QUIZ_TYPES;
  const accuracyByType = await getQuizTypeAccuracy(userId);

  if (targetType === "kanji") {
    // 한자는 常用漢字 2,136자 전원 공용 데이터라(PROMPT 33) 단어처럼 소유권 검증이 필요 없다.
    // quizTypes는 다른 대상의 유형이 섞여 요청돼도 조용히 걸러낸다.
    const allowedTypes = quizTypes?.filter((t) => kanjiTypeSet.includes(t)) ?? KANJI_QUIZ_TYPES;
    const weights = computeQuizTypeWeights(accuracyByType, allowedTypes);
    const targets = await fetchQuizKanji(targetIds);
    const pool = await fetchKanjiPool();
    const questions = generateKanjiQuizSession(targets, pool, Math.random, allowedTypes, weights);
    return { questions, boostedType: pickBoostedType(weights) };
  }

  const allowedTypes = quizTypes?.filter((t) => vocabTypeSet.includes(t)) ?? VOCAB_QUIZ_TYPES;
  const weights = computeQuizTypeWeights(accuracyByType, allowedTypes);
  await requireOwnedVocabularies(targetIds, userId);
  const targets = await fetchQuizVocabularies(targetIds);
  const pool = await fetchQuizPool(targets);
  const questions = generateQuizSession(targets, pool, Math.random, allowedTypes, weights);

  return { questions, boostedType: pickBoostedType(weights) };
});

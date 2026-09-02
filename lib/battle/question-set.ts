import "server-only";

import { ApiError } from "@/lib/api/error";
import { BATTLE_ROUND_COUNT } from "@/lib/battle/constants";
import { db } from "@/lib/db";
import { fetchQuizPool, fetchQuizVocabularies } from "@/lib/quiz/queries";
import { shuffle } from "@/lib/quiz/random";
import { generateQuizSession } from "@/lib/quiz/session";
import type { QuizQuestion } from "@/lib/quiz/types";

/**
 * 방 시작 시 한 번 호출해 대결 문제 세트를 만든다(PROMPT 19 엔진 재사용, 객관식만 — 대결 채점을
 * choice id 비교 하나로 단순/명확하게 유지하기 위한 선택). 단어장의 단어를 무작위로 최대
 * `BATTLE_ROUND_COUNT`개 뽑아 `generateQuizSession`에 넘긴다 — 객관식 오답 보기가 부족한 단어는
 * 그 함수가 조용히 걸러내므로, 실제 반환 개수가 요청보다 적을 수 있다(호출자가 그 개수를 그대로
 * 방의 round_count로 채택한다).
 */
export async function generateBattleQuestions(vocabularyBookId: string): Promise<QuizQuestion[]> {
  const items = await db.vocabularyBookItem.findMany({
    where: { vocabulary_book_id: vocabularyBookId },
    select: { vocabulary_id: true },
  });

  const candidateIds = shuffle(items.map((item) => item.vocabulary_id)).slice(
    0,
    BATTLE_ROUND_COUNT,
  );
  const targets = await fetchQuizVocabularies(candidateIds);
  const pool = await fetchQuizPool(targets);
  const questions = generateQuizSession(targets, pool, Math.random, ["MULTIPLE_CHOICE"]);

  if (questions.length === 0) {
    throw new ApiError("VALIDATION_ERROR", "이 단어장으로는 대결 문제를 만들 수 없어요.");
  }

  return questions;
}

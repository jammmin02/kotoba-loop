import { assignQuizTypes } from "@/lib/quiz/distribution";
import { generateKanjiQuestion, generateQuestion } from "@/lib/quiz/generator";
import { shuffle } from "@/lib/quiz/random";
import { KANJI_QUIZ_TYPES, VOCAB_QUIZ_TYPES } from "@/lib/quiz/types";
import type {
  QuizKanji,
  QuizKanjiPoolEntry,
  QuizPoolEntry,
  QuizQuestion,
  QuizType,
  QuizVocabulary,
} from "@/lib/quiz/types";

/** `computeQuizTypeWeights`(PROMPT 39)의 결과 — 없으면(null/undefined) 균등 배분으로 폴백한다. */
type QuizTypeWeights = Partial<Record<QuizType, number>> | null;

/**
 * 대상 목록(단어 또는 한자)으로 퀴즈 세트를 만드는 공용 조립 알고리즘. `assignQuizTypes`로
 * 유형을 균등 배정하되, 배정된 유형을 생성할 수 없는 대상(예: 객관식 오답 풀 부족, 예문 없음)은
 * 나머지 유형을 무작위 순서로 대신 시도한다(계획서 요구사항: "최소 풀 크기 미달 시 해당 유형
 * 제외하고 다른 유형으로 대체"). 모든 유형이 실패하는 대상만 결과에서 제외된다.
 *
 * `generateQuizSession`(단어)과 `generateKanjiQuizSession`(한자, PROMPT 36)이 대상 타입만 다르게
 * 이 함수를 공유한다 — 세션 조립 로직 자체는 중복 구현하지 않는다.
 */
function runQuizSessionAssembly<T extends { id: string }>(
  targets: T[],
  generateFn: (target: T, quizType: QuizType, random: () => number) => QuizQuestion | null,
  random: () => number,
  allowedTypes: readonly QuizType[],
  weights: QuizTypeWeights,
): QuizQuestion[] {
  const assignedTypes = assignQuizTypes(targets.length, random, allowedTypes, weights);

  const questions: QuizQuestion[] = [];
  targets.forEach((target, index) => {
    const preferredType = assignedTypes[index];
    const fallbackTypes = shuffle(
      allowedTypes.filter((quizType) => quizType !== preferredType),
      random,
    );

    for (const quizType of [preferredType, ...fallbackTypes]) {
      const question = generateFn(target, quizType, random);
      if (question) {
        questions.push(question);
        return;
      }
    }
  });

  return questions;
}

export function generateQuizSession(
  targets: QuizVocabulary[],
  pool: QuizPoolEntry[],
  random: () => number = Math.random,
  allowedTypes: readonly QuizType[] = VOCAB_QUIZ_TYPES,
  /** 정답률 기반 출제 비중(PROMPT 39) — 생략/null이면 균등 배분. */
  weights: QuizTypeWeights = null,
): QuizQuestion[] {
  const types = allowedTypes.length > 0 ? allowedTypes : VOCAB_QUIZ_TYPES;
  return runQuizSessionAssembly(
    targets,
    (target, quizType, r) => generateQuestion(target, quizType, pool, r),
    random,
    types,
    weights,
  );
}

/** `generateQuizSession`의 한자 버전(PROMPT 36) — 같은 조립 알고리즘을 재사용한다. */
export function generateKanjiQuizSession(
  targets: QuizKanji[],
  pool: QuizKanjiPoolEntry[],
  random: () => number = Math.random,
  allowedTypes: readonly QuizType[] = KANJI_QUIZ_TYPES,
  /** 정답률 기반 출제 비중(PROMPT 39) — 생략/null이면 균등 배분. */
  weights: QuizTypeWeights = null,
): QuizQuestion[] {
  const types = allowedTypes.length > 0 ? allowedTypes : KANJI_QUIZ_TYPES;
  return runQuizSessionAssembly(
    targets,
    (target, quizType, r) => generateKanjiQuestion(target, quizType, pool, r),
    random,
    types,
    weights,
  );
}

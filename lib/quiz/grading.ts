import { normalizeAnswer } from "@/lib/quiz/normalize";
import type { QuizQuestion } from "@/lib/quiz/types";

function gradeByExactMatch(userAnswer: string, acceptable: string[]): boolean {
  const normalizedAnswer = normalizeAnswer(userAnswer);
  if (!normalizedAnswer) return false;
  return acceptable.some((candidate) => normalizeAnswer(candidate) === normalizedAnswer);
}

/**
 * 뜻(사전형) 문자열에서 매칭에 쓸 어간을 뽑는다. 한국어 용언 사전형은 항상 "다"로 끝나
 * ("먹다"→"먹었어요") 그대로는 활용형과 거의 일치하지 않으므로, 끝의 "다"를 잘라 어간만
 * 비교한다("먹"). 명사 등 "다"로 끝나지 않는 뜻은 그대로 쓴다(간이 휴리스틱, 완전한 형태소
 * 분석은 범위 밖).
 */
function toKeywordStem(meaning: string): string {
  const normalized = normalizeAnswer(meaning);
  return normalized.length > 1 && normalized.endsWith("다") ? normalized.slice(0, -1) : normalized;
}

/**
 * 예문 해석(SENTENCE_TRANSLATION) 채점: 완전한 자연어 채점은 범위 밖(계획서/PROMPT 20 명시)이므로,
 * 예시 번역 전문과의 일치 대신 대상 단어의 한국어 뜻이 답변에 포함되는지로 판정한다
 * (추가 결정 필요 항목 — 키워드 매칭 수준의 기본값 채택).
 */
function gradeByKeywordMatch(userAnswer: string, keywords: string[]): boolean {
  const normalizedAnswer = normalizeAnswer(userAnswer);
  if (!normalizedAnswer) return false;
  return keywords.some((keyword) => normalizedAnswer.includes(toKeywordStem(keyword)));
}

/**
 * 객관식(선택지가 있는 유형 — MULTIPLE_CHOICE, KANJI_MEANING, KANJI_SELECT)은 선택한 보기의
 * id를 correctAnswer와 그대로 비교한다(텍스트 정규화 불필요). 특정 유형 이름을 나열하지 않고
 * `choices` 유무로 판단해, 새 객관식 유형이 추가돼도 이 분기를 다시 손대지 않아도 된다.
 * 그 외 유형은 정규화 후 correctAnswer/acceptableAnswers 중 하나라도 일치하면 정답으로 처리한다.
 */
export function gradeQuizAnswer(question: QuizQuestion, userAnswer: string): boolean {
  if (question.choices && question.choices.length > 0) {
    return userAnswer === question.correctAnswer;
  }

  if (question.quizType === "SENTENCE_TRANSLATION") {
    return gradeByKeywordMatch(userAnswer, question.acceptableAnswers ?? [question.correctAnswer]);
  }

  return gradeByExactMatch(userAnswer, [
    question.correctAnswer,
    ...(question.acceptableAnswers ?? []),
  ]);
}

import type { ReviewGrade } from "@/lib/srs/types";

/** 객관식 오답 보기 개수(정답 1개를 더해 총 4지선다). */
export const MULTIPLE_CHOICE_WRONG_COUNT = 3;

/**
 * 퀴즈는 정답/오답 2단계 판정만 제공하지만 SRS(PROMPT 16)는 4단계 평가(모르겠음/헷갈림/
 * 기억남/쉬움)를 받는다. 정답=기억남(GOOD), 오답=모르겠음(UNKNOWN)에 대응시킨다(추가 결정
 * 필요 항목 — 이 문서에서 기본값 채택). "헷갈림/쉬움"은 퀴즈 결과만으로는 구분할 근거가
 * 없어 사용하지 않는다. 실제 ReviewHistory 기록/SRS 갱신 연결은 PROMPT 20에서 이루어진다.
 */
export function mapQuizResultToGrade(isCorrect: boolean): ReviewGrade {
  return isCorrect ? "GOOD" : "UNKNOWN";
}

/**
 * 오답 문제를 세션 큐 끝에 다시 넣어 즉시 재출제하는 횟수 상한(문제당). 무제한 재출제 시
 * 계속 틀리는 문제가 세션을 끝없이 늘릴 수 있어, 반복해도 못 맞히면 세션 완료 후 "틀린 것만
 * 다시 풀기"로 넘긴다.
 */
export const MAX_SESSION_REQUEUE_PER_QUESTION = 1;

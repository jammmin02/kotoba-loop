import { SECONDS_PER_WORD } from "@/lib/study/constants";
import { estimateStudyMinutes } from "@/lib/study/today-summary";

/**
 * AI 자동 학습 계획(PROMPT 43, 계획서 52장) — 규칙 기반 추천 학습량 계산. AI는 이 수치를
 * 자연어로 설명하는 역할(lib/ai/exam-plan-explanation.ts)에만 쓰고, 수량 계산 자체는 이
 * 순수 함수가 전담한다(A.7 원칙 — 정확성이 중요한 계산은 AI 단독에 맡기지 않는다).
 */

/** 새 단어 1개당 되돌아오는 복습 횟수의 근사 비율. 계획서 52장 예시(새 12개/복습 31개,
 * 31/12≈2.58)에서 역산해 소수점 상수로 근사한다 — SRS 간격이 안정 상태에 도달하면 새
 * 단어 대비 복습량이 이 비율에 가까워진다는 가정. */
export const REVIEW_TO_NEW_WORD_RATIO = 2.5;

/** 하루 추천량이 극단적 입력(예: 시험이 내일)에서도 비현실적으로 커지지 않도록 두는 상한. */
export const MAX_NEW_WORDS_PER_DAY = 50;
export const MAX_KANJI_PER_DAY = 30;
export const MAX_SENTENCES_PER_DAY = 5;

/** 가용 시간이 0이거나 비정상적으로 커도 계산이 깨지지 않도록 두는 범위(분). */
export const MIN_PLAN_AVAILABLE_MINUTES = 5;
export const MAX_PLAN_AVAILABLE_MINUTES = 240;

export interface ExamGoalCandidate {
  id: string;
  isActive: boolean;
  examDate: Date;
}

/**
 * 여러 시험 목표 중 오늘의 추천 계산에 쓸 "현재 목표"를 고른다(2026-08-25 사용자 확정).
 * 아직 치르지 않은 목표(시험일이 오늘 이후, 오늘 포함)만 후보로 삼고, 그중 `isActive`가
 * true인 것을 우선하며, 없으면 시험일이 가장 가까운 것을 고른다. 후보가 하나도 없으면(모든
 * 시험이 이미 지났으면) null을 반환한다 — 호출부가 "활성 목표 없음" 폴백을 처리한다.
 */
export function selectActiveExamGoal<T extends ExamGoalCandidate>(
  goals: T[],
  startOfToday: Date,
): T | null {
  const upcoming = goals.filter((goal) => goal.examDate.getTime() >= startOfToday.getTime());
  if (upcoming.length === 0) return null;

  const active = upcoming.find((goal) => goal.isActive);
  if (active) return active;

  return upcoming.reduce((closest, goal) =>
    goal.examDate.getTime() < closest.examDate.getTime() ? goal : closest,
  );
}

export interface RecommendedPlanInput {
  /** 시험까지 남은 일수. 1 미만이 들어와도 내부에서 최소 1로 보정한다. */
  daysRemaining: number;
  /** 아직 학습을 시작하지 않은 단어(learning_status=NEW) 수. */
  backlogNewWords: number;
  /** 학습을 시작했지만 아직 마스터하지 못한 단어(LEARNING/REVIEW/WEAK) 수. */
  backlogReviewWords: number;
  /** 아직 마스터하지 못한 한자(常用漢字 전체 중) 수. */
  backlogKanji: number;
  /** 사용자의 하루 가용 학습 시간(분, 온보딩 `dailyStudyTime`). */
  availableMinutes: number;
}

export interface RecommendedPlan {
  newWordsPerDay: number;
  reviewPerDay: number;
  kanjiPerDay: number;
  sentencePerDay: number;
  estimatedMinutes: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 남은 기간 동안 밀린 분량을 다 처리하려면 하루 얼마씩 해야 하는지(상한 포함). */
function paceFor(remaining: number, daysRemaining: number, max: number): number {
  if (remaining <= 0) return 0;
  return Math.min(max, Math.ceil(remaining / daysRemaining));
}

/** 이상적인 페이스에 시간 제약 스케일을 곱한 뒤, 원래 밀린 분량이 있었다면 0으로 사라지지
 * 않도록(반올림으로 0이 되는 것을 방지) 최소 1을 보장한다. */
function scaleCount(ideal: number, scale: number): number {
  if (ideal <= 0) return 0;
  return Math.max(1, Math.round(ideal * scale));
}

/**
 * 현재 단어/한자 진행률(밀린 분량)과 시험까지 남은 기간으로부터 하루 추천 학습량을
 * 역산한다. 가용 시간을 초과하는 이상적인 페이스는 가용 시간에 맞춰 축소하지만, 가용
 * 시간이 남아도 실제로 밀린 분량보다 더 많이 추천하지는 않는다(scale은 1을 넘지 않음).
 */
export function computeRecommendedPlan({
  daysRemaining,
  backlogNewWords,
  backlogReviewWords,
  backlogKanji,
  availableMinutes,
}: RecommendedPlanInput): RecommendedPlan {
  const safeDays = Math.max(1, Math.round(daysRemaining));

  const idealNewWords = paceFor(backlogNewWords, safeDays, MAX_NEW_WORDS_PER_DAY);
  const idealReview = paceFor(
    backlogReviewWords,
    safeDays,
    Math.round(MAX_NEW_WORDS_PER_DAY * REVIEW_TO_NEW_WORD_RATIO),
  );
  const idealKanji = paceFor(backlogKanji, safeDays, MAX_KANJI_PER_DAY);
  const idealSentence =
    idealNewWords > 0 ? clamp(Math.round(idealNewWords / 4), 1, MAX_SENTENCES_PER_DAY) : 0;

  const idealTotal = idealNewWords + idealReview + idealKanji + idealSentence;

  const clampedMinutes = clamp(
    Math.round(availableMinutes),
    MIN_PLAN_AVAILABLE_MINUTES,
    MAX_PLAN_AVAILABLE_MINUTES,
  );
  const targetSlots = Math.floor((clampedMinutes * 60) / SECONDS_PER_WORD);
  const scale = idealTotal > 0 && idealTotal > targetSlots ? targetSlots / idealTotal : 1;

  const newWordsPerDay = scaleCount(idealNewWords, scale);
  const reviewPerDay = scaleCount(idealReview, scale);
  const kanjiPerDay = scaleCount(idealKanji, scale);
  const sentencePerDay = scaleCount(idealSentence, scale);

  return {
    newWordsPerDay,
    reviewPerDay,
    kanjiPerDay,
    sentencePerDay,
    estimatedMinutes: estimateStudyMinutes(
      newWordsPerDay + reviewPerDay + kanjiPerDay + sentencePerDay,
    ),
  };
}

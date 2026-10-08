// 작문 퀘스트의 공용 상수/순수 로직 — server-only 의존이 없어 클라이언트와 단위 테스트에서도 쓴다.

export const COMPOSITION_SITUATIONS = ["일상", "여행", "직장", "친구", "학교"] as const;
export const COMPOSITION_VOCAB_LEVELS = ["N5", "N4", "N3", "N2"] as const;
export const COMPOSITION_LEVELS = ["단문", "접속 포함", "복문"] as const;
export const COMPOSITION_TONES = ["정중체", "반말"] as const;
export const COMPOSITION_MODES = ["DEFAULT", "CUSTOM", "ENDLESS"] as const;

export type CompositionModeValue = (typeof COMPOSITION_MODES)[number];

export const COMPOSITION_DEFAULT_COUNT = 5;
export const COMPOSITION_CUSTOM_MIN = 1;
export const COMPOSITION_CUSTOM_MAX = 30;

export const COMPOSITION_PROMPT_MAX = 120;
export const COMPOSITION_ANSWER_MAX = 200;
/** 출제 중복 방지를 위해 AI에게 넘기는 직전 문제 개수 상한. */
export const COMPOSITION_EXCLUDE_MAX = 20;

/** 이 점수 이상이면 "정답으로 인정"과 EXP 지급 기준을 함께 만족한다고 본다. */
export const COMPOSITION_ACCEPT_SCORE = 60;

/** 모드별 목표 문항 수 — 무한 모드는 null(끝을 정하지 않는다). */
export function resolveTargetCount(
  mode: CompositionModeValue,
  custom?: number | null,
): number | null {
  if (mode === "ENDLESS") return null;
  if (mode === "DEFAULT") return COMPOSITION_DEFAULT_COUNT;
  const n = Math.trunc(custom ?? 0);
  return Math.min(Math.max(n, COMPOSITION_CUSTOM_MIN), COMPOSITION_CUSTOM_MAX);
}

/** 목표 문항 수에 도달했는지 — 무한 모드는 절대 자동 종료되지 않는다. */
export function isSessionComplete(targetCount: number | null, answeredCount: number): boolean {
  return targetCount !== null && answeredCount >= targetCount;
}

export interface AttemptScoreLike {
  score: number;
  grammar_score: number;
  vocabulary_score: number;
  naturalness_score: number;
  is_accepted: boolean;
}

export interface CompositionSummary {
  answeredCount: number;
  acceptedCount: number;
  averageScore: number;
  averageGrammar: number;
  averageVocabulary: number;
  averageNaturalness: number;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function summarizeAttempts(attempts: AttemptScoreLike[]): CompositionSummary {
  return {
    answeredCount: attempts.length,
    acceptedCount: attempts.filter((a) => a.is_accepted).length,
    averageScore: average(attempts.map((a) => a.score)),
    averageGrammar: average(attempts.map((a) => a.grammar_score)),
    averageVocabulary: average(attempts.map((a) => a.vocabulary_score)),
    averageNaturalness: average(attempts.map((a) => a.naturalness_score)),
  };
}

// 작문 기록 통계 집계 — DB/서버 의존이 없는 순수 함수라 단위 테스트할 수 있다.

import { addKstDays, startOfKstDay, toKstDateKey } from "@/lib/datetime";

/** 통계에 쓰는 작문 1건. feedback은 DB의 JSON을 그대로 받으므로 형태를 신뢰하지 않고 방어적으로 읽는다. */
export interface StatsAttemptInput {
  created_at: Date;
  score: number;
  grammar_score: number;
  vocabulary_score: number;
  naturalness_score: number;
  is_accepted: boolean;
  hint_used: boolean;
  feedback: unknown;
  situation: string;
  vocab_level: string;
  composition_level: string;
}

export interface CompositionStatsTotals {
  attemptCount: number;
  acceptedRate: number;
  averageScore: number;
  averageGrammar: number;
  averageVocabulary: number;
  averageNaturalness: number;
  hintRate: number;
}

export interface CompositionDailyStat {
  /** KST "YYYY-MM-DD". */
  date: string;
  count: number;
  /** 그날 푼 문제가 없으면 null. */
  averageScore: number | null;
}

export interface CompositionBreakdownStat {
  label: string;
  count: number;
  averageScore: number;
}

export interface CompositionKindStat {
  kind: string;
  count: number;
}

export interface CompositionStats {
  totals: CompositionStatsTotals;
  daily: CompositionDailyStat[];
  bySituation: CompositionBreakdownStat[];
  byVocabLevel: CompositionBreakdownStat[];
  byCompositionLevel: CompositionBreakdownStat[];
  /** 틀린 부분 유형별 횟수(많은 순). "실제 표현"은 오류가 아니라 제외한다. */
  mistakeKinds: CompositionKindStat[];
  /** "더 흔한 표현이 있다"는 제안을 받은 횟수. */
  naturalSuggestionCount: number;
}

export interface BuildStatsOptions {
  /** 항목별 정렬 순서(옵션 순서 그대로 보여주고 싶을 때). 없으면 문제 수가 많은 순. */
  order?: {
    situation?: readonly string[];
    vocabLevel?: readonly string[];
    compositionLevel?: readonly string[];
  };
}

export const STATS_DAILY_DAYS = 14;
const NATURAL_KIND = "실제 표현";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** feedback JSON({ items: [{ kind, ... }] })에서 kind 목록만 안전하게 꺼낸다. */
export function extractFeedbackKinds(feedback: unknown): string[] {
  if (typeof feedback !== "object" || feedback === null) return [];
  const items = (feedback as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const kind = (item as { kind?: unknown } | null)?.kind;
    return typeof kind === "string" ? [kind] : [];
  });
}

function breakdown(
  attempts: StatsAttemptInput[],
  pick: (a: StatsAttemptInput) => string,
  order?: readonly string[],
): CompositionBreakdownStat[] {
  const groups = new Map<string, number[]>();
  for (const attempt of attempts) {
    const key = pick(attempt);
    groups.set(key, [...(groups.get(key) ?? []), attempt.score]);
  }
  const rows = [...groups].map(([label, scores]) => ({
    label,
    count: scores.length,
    averageScore: average(scores),
  }));
  if (order) {
    return rows.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  }
  return rows.sort((a, b) => b.count - a.count);
}

export function buildCompositionStats(
  attempts: StatsAttemptInput[],
  now: Date,
  options: BuildStatsOptions = {},
): CompositionStats {
  const count = attempts.length;

  const totals: CompositionStatsTotals = {
    attemptCount: count,
    acceptedRate: percent(attempts.filter((a) => a.is_accepted).length, count),
    averageScore: average(attempts.map((a) => a.score)),
    averageGrammar: average(attempts.map((a) => a.grammar_score)),
    averageVocabulary: average(attempts.map((a) => a.vocabulary_score)),
    averageNaturalness: average(attempts.map((a) => a.naturalness_score)),
    hintRate: percent(attempts.filter((a) => a.hint_used).length, count),
  };

  // 오늘을 포함한 최근 N일을 오래된 날부터 채운다 — 푼 문제가 없는 날도 빈 칸으로 남겨 추이가 끊기지 않게 한다.
  const byDay = new Map<string, number[]>();
  for (const attempt of attempts) {
    const key = toKstDateKey(attempt.created_at);
    byDay.set(key, [...(byDay.get(key) ?? []), attempt.score]);
  }
  const today = startOfKstDay(now);
  const daily: CompositionDailyStat[] = [];
  for (let offset = STATS_DAILY_DAYS - 1; offset >= 0; offset--) {
    const date = toKstDateKey(addKstDays(today, -offset));
    const scores = byDay.get(date) ?? [];
    daily.push({
      date,
      count: scores.length,
      averageScore: scores.length ? average(scores) : null,
    });
  }

  const kindCounts = new Map<string, number>();
  let naturalSuggestionCount = 0;
  for (const attempt of attempts) {
    for (const kind of extractFeedbackKinds(attempt.feedback)) {
      if (kind === NATURAL_KIND) {
        naturalSuggestionCount += 1;
      } else {
        kindCounts.set(kind, (kindCounts.get(kind) ?? 0) + 1);
      }
    }
  }
  const mistakeKinds = [...kindCounts]
    .map(([kind, c]) => ({ kind, count: c }))
    .sort((a, b) => b.count - a.count);

  return {
    totals,
    daily,
    bySituation: breakdown(attempts, (a) => a.situation, options.order?.situation),
    byVocabLevel: breakdown(attempts, (a) => a.vocab_level, options.order?.vocabLevel),
    byCompositionLevel: breakdown(
      attempts,
      (a) => a.composition_level,
      options.order?.compositionLevel,
    ),
    mistakeKinds,
    naturalSuggestionCount,
  };
}

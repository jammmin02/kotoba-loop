// 회화 기록 통계 집계 — 작문 통계와 같은 집계 함수를 재사용한다(순수 함수, 서버 의존 없음).

import { buildCompositionStats, type CompositionStats } from "@/lib/composition/stats";

/** 통계에 쓰는 학습자 발화 1건(채점이 붙은 USER 메시지 + 세션 설정). */
export interface ConversationStatsInput {
  created_at: Date;
  score: number;
  grammar_score: number;
  vocabulary_score: number;
  naturalness_score: number;
  is_accepted: boolean;
  hint_used: boolean;
  feedback: unknown;
  scenario: string;
  vocab_level: string;
  topic: string;
}

/**
 * 작문 통계의 축을 회화에 맞게 옮긴다: 상황→상대(scenario), 작문 수준→세부 상황(topic).
 * 결과 모양이 같아서 화면 컴포넌트도 그대로 쓴다.
 */
export function buildConversationStats(
  rows: ConversationStatsInput[],
  now: Date,
  options: { scenarioOrder?: readonly string[]; vocabLevelOrder?: readonly string[] } = {},
): CompositionStats {
  return buildCompositionStats(
    rows.map((row) => ({
      created_at: row.created_at,
      score: row.score,
      grammar_score: row.grammar_score,
      vocabulary_score: row.vocabulary_score,
      naturalness_score: row.naturalness_score,
      is_accepted: row.is_accepted,
      hint_used: row.hint_used,
      feedback: row.feedback,
      situation: row.scenario,
      vocab_level: row.vocab_level,
      composition_level: row.topic,
    })),
    now,
    { order: { situation: options.scenarioOrder, vocabLevel: options.vocabLevelOrder } },
  );
}

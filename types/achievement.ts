/** 업적 목록 화면(Collection Grid, PROMPT 05 재사용)에 쓰는 전체 카탈로그 항목 1개. */
export interface AchievementView {
  code: string;
  category: "word" | "kanji";
  title: string;
  conditionValue: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export type AchievementsResponse = AchievementView[];

/** 학습 액션 처리 중 방금 잠금 해제된 업적 — 축하 토스트 표시용 최소 정보
 * (lib/game/grant.ts GameProfileGain.unlockedAchievements, POST /api/vocabularies 응답에 실린다). */
export interface UnlockedAchievementView {
  code: string;
  title: string;
  category: "word" | "kanji";
}

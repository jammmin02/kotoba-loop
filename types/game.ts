import type { UnlockedAchievementView } from "@/types/achievement";
import type { PetGrowthResult } from "@/types/pet";

/** `grantActionExp`(lib/game/grant.ts) 결과 — EXP를 지급하는 API 응답에 공통으로 실린다. */
export interface GameProfileGain {
  expGained: number;
  level: number;
  exp: number;
  leveledUp: boolean;
  /** 이 액션으로 방금 완료된 Daily Quest 코드들(PROMPT 25). 없으면 빈 배열. */
  completedQuestCodes: string[];
  /** 이 액션으로 방금 잠금 해제된 업적(PROMPT 27). 없으면 빈 배열. */
  unlockedAchievements: UnlockedAchievementView[];
  /** 이 액션의 레벨업으로 펫이 방금 성장/졸업했을 때만. 활성 펫이 없거나 단계 변화가 없으면 null. */
  petGrowth: PetGrowthResult | null;
}

export interface GameProfileResponse {
  level: number;
  exp: number;
  requiredExp: number;
  /** 조회 시점 계산(lib/game/streak.ts getDisplayStreak)이 적용된 값 — 하루 이상 미학습이면
   * DB의 current_streak가 아직 갱신 전이어도 0으로 내려온다. */
  currentStreak: number;
  longestStreak: number;
  /** 오늘(KST) 학습 완료 보너스를 이미 받았는지 — 스트릭이 끊길 위험 안내 문구 판단에 쓴다. */
  studiedToday: boolean;
  /** 보유 중인 스트릭 프리즈 개수(PROMPT 27.5, 최대 STREAK_FREEZE_MAX_COUNT). */
  streakFreezeCount: number;
  /** 자동 보호가 방금 발동했음을 1회 알리기 위한 플래그 — 이 응답을 반환하며 서버가
   * DB의 streak_freeze_notice_pending을 즉시 false로 되돌리므로, 다음 조회부터는 다시
   * false로 내려온다(1회성 토스트 트리거). */
  streakFreezeJustConsumed: boolean;
}

/** GET /api/game/calendar 응답 — 월 단위 학습 캘린더(PROMPT 54). */
export interface GameCalendarResponse {
  year: number;
  month: number;
  /** 그 달 안에서 학습 기록(ReviewHistory)이 있는 KST 날짜 목록, "YYYY-MM-DD". */
  studiedDates: string[];
  /** 그 달 안에서 스트릭 프리즈로 보호된(StreakFreezeLog) KST 날짜 목록, "YYYY-MM-DD"
   * (PROMPT 27.5). studiedDates와 겹치지 않는다 — 애초에 학습하지 않은 날만 기록된다. */
  protectedDates: string[];
  /** 서버 기준 오늘 날짜, "YYYY-MM-DD" — 클라이언트가 별도로 KST 계산을 할 필요가 없도록 실어준다. */
  todayKey: string;
  /** 그 달 안에서 새로 등록한 단어 수, KST 날짜("YYYY-MM-DD") → 개수. 등록이 없었던 날은 키 자체가 없다. */
  registeredCounts: Record<string, number>;
}

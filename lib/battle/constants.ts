/** 대결 방 기본 라운드 수(계획서 PROMPT 54) — 단어장에 문제를 만들 만한 단어가 부족하면
 * `generateBattleQuestions`가 이보다 적은 문제를 반환하고, 그 실제 개수로 방의 round_count를 줄인다. */
export const BATTLE_ROUND_COUNT = 10;

/** 라운드당 제한시간(ms, 계획서 PROMPT 54 "제한시간(예: 15초)"). */
export const BATTLE_ROUND_DURATION_MS = 15_000;

/** 대결 시작에 필요한 최소 참가자 수(호스트 포함) — 혼자서는 "대결"이 성립하지 않는다. */
export const BATTLE_MIN_PARTICIPANTS = 2;

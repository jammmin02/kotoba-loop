export type PetSpecies = "cat" | "dinosaur" | "rabbit";
export type PetStage = "egg" | "baby" | "child" | "teen" | "adult";

/** 학습 액션 처리 중 방금 펫 성장 단계가 바뀌었을 때만 실리는 정보(축하 토스트 + sparkle 모션 트리거용,
 * lib/game/grant.ts GameProfileGain.petGrowth). 변화가 없으면 null. */
export interface PetGrowthResult {
  petId: string;
  species: PetSpecies;
  newStage: PetStage;
  justGraduated: boolean;
}

/** GET/POST /api/pet 응답에 실리는 활성 펫 1개. */
export interface UserPetView {
  id: string;
  species: PetSpecies;
  stage: PetStage;
  /** 선택 이후 레벨 상승분(현재 UserGameProfile.level - level_at_start) — 위젯 진행 안내용. */
  levelsSinceStart: number;
  /** 다음 성장 단계(또는 졸업)까지 남은 레벨 상승분. */
  levelsUntilNextStage: number;
  /** 현재 단계 구간 안에서의 진행률(EXP Bar와 같은 형태) — 졸업 조건을 채우면 마지막 구간이 가득 찬 값으로 고정. */
  stageProgressCurrent: number;
  stageProgressTotal: number;
  startedAt: string;
}

export interface PetActiveResponse {
  pet: UserPetView | null;
}

/** POST /api/admin/pet/level, /api/admin/pet/select 응답 — 관리자 전용 풀테스트 도구. */
export interface AdminPetLevelResponse {
  pet: UserPetView;
  /** 이 조작으로 단계/졸업이 실제로 바뀌었을 때만 값이 있다(펫 위젯 sparkle 모션 트리거용). */
  growth: PetGrowthResult | null;
}

/** GET /api/pet/history — 현재 펫 + 과거(졸업한) 펫 전체 목록, 최신순. */
export interface PetHistoryEntry {
  id: string;
  species: PetSpecies;
  stage: PetStage;
  isActive: boolean;
  isGraduated: boolean;
  startedAt: string;
  graduatedAt: string | null;
}

export type PetHistoryResponse = PetHistoryEntry[];

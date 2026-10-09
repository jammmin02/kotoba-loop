// 회화 퀘스트의 공용 상수/순수 로직 — server-only 의존이 없어 클라이언트와 단위 테스트에서도 쓴다.

import type { CompositionSummary } from "@/lib/composition/config";
import { COMPOSITION_TONES } from "@/lib/composition/config";

export const CONVERSATION_SCENARIOS = ["친구", "상사", "처음 보는 사람", "점원"] as const;
export type ConversationScenario = (typeof CONVERSATION_SCENARIOS)[number];
export type ConversationTone = (typeof COMPOSITION_TONES)[number];

/** 사용자가 말할 턴 수 선택지. 무한 모드는 대화가 길어질수록 입력 토큰이 누적돼 두지 않는다. */
export const CONVERSATION_TURN_OPTIONS = [6, 10, 15, 20] as const;
export const CONVERSATION_DEFAULT_TURNS = 10;

export const CONVERSATION_MESSAGE_MAX = 200;
/** AI에게 넘기는 최근 대화 턴 수(한 턴 = 상대 발화 + 내 발화). 비용과 프롬프트 길이를 묶어 둔다. */
export const CONVERSATION_HISTORY_WINDOW_TURNS = 8;

/** EXP를 받으려면 최소 이만큼은 말해야 한다("はい" 한 번 하고 끝내는 파밍 방지). */
export const CONVERSATION_MIN_TURNS_FOR_EXP = 3;
export const CONVERSATION_EXP = 5;
/** 힌트를 자주 열어 본 세션의 EXP. */
export const CONVERSATION_HINT_EXP = 2;
/** 하루에 EXP를 받을 수 있는 회화 세션 수(KST). */
export const CONVERSATION_DAILY_EXP_SESSION_CAP = 3;

export interface ConversationTopic {
  /** 화면에 보여주는 한국어 이름(DB에도 이 값이 저장된다). */
  label: string;
  /** AI에게 알려 주는 구체적 상황 설명. */
  detail: string;
}

export interface ConversationScenarioDef {
  /** 설정 화면 한 줄 설명. */
  blurb: string;
  /** 대화창에서 상대 말풍선 위에 붙는 역할 이름. */
  aiLabel: string;
  /** 사용자가 고를 수 있는 말투 — 하나뿐이면 고정이다. */
  tones: readonly ConversationTone[];
  topics: readonly ConversationTopic[];
}

const STORES: readonly ConversationTopic[] = [
  { label: "카페", detail: "카페. 당신은 카페 점원이고 학습자는 음료와 디저트를 주문하는 손님" },
  { label: "편의점", detail: "편의점. 당신은 편의점 점원이고 학습자는 계산하려는 손님" },
  { label: "음식점", detail: "음식점. 당신은 식당 점원이고 학습자는 식사를 주문하는 손님" },
  { label: "옷 가게", detail: "옷 가게. 당신은 옷 가게 점원이고 학습자는 옷을 고르는 손님" },
  { label: "서점", detail: "서점. 당신은 서점 점원이고 학습자는 책을 찾는 손님" },
  { label: "약국", detail: "약국. 당신은 약국 점원이고 학습자는 증상을 설명하며 약을 찾는 손님" },
  {
    label: "가전제품 매장",
    detail: "가전제품 매장. 당신은 매장 점원이고 학습자는 제품을 비교하는 손님",
  },
  { label: "미용실", detail: "미용실. 당신은 미용사이고 학습자는 머리를 하러 온 손님" },
  {
    label: "기념품 가게",
    detail: "관광지 기념품 가게. 당신은 점원이고 학습자는 선물을 고르는 손님",
  },
  { label: "역 매표소", detail: "역 매표소. 당신은 역무원이고 학습자는 표를 사는 승객" },
];

export const CONVERSATION_SCENARIO_DEFS: Record<ConversationScenario, ConversationScenarioDef> = {
  친구: {
    blurb: "편하게 수다 떨기. 말투(반말/정중체)를 고를 수 있어요.",
    aiLabel: "친구",
    tones: ["반말", "정중체"],
    topics: [
      { label: "주말 약속 잡기", detail: "이번 주말에 같이 놀 계획을 정하는 중" },
      { label: "영화·드라마 이야기", detail: "최근에 본 영화나 드라마에 대해 이야기하는 중" },
      { label: "근황 토크", detail: "오랜만에 만나서 요즘 어떻게 지냈는지 이야기하는 중" },
      { label: "점심 메뉴 고르기", detail: "오늘 점심에 뭘 먹을지 정하는 중" },
      { label: "여행 계획", detail: "다음 휴가에 같이 갈 여행지를 고르는 중" },
    ],
  },
  상사: {
    blurb: "경어(존경어·겸양어) 연습. 항상 정중체로 말해요.",
    aiLabel: "상사",
    tones: ["정중체"],
    topics: [
      {
        label: "업무 진행 보고",
        detail: "학습자가 부하 직원으로서 맡은 업무의 진행 상황을 상사에게 보고하는 중",
      },
      { label: "휴가 신청", detail: "학습자가 부하 직원으로서 상사에게 휴가를 신청하는 중" },
      {
        label: "실수 사과",
        detail: "학습자가 부하 직원으로서 업무 실수를 상사에게 사과하고 대책을 말하는 중",
      },
      { label: "회식 권유", detail: "상사가 학습자에게 회식 참석 여부를 묻는 중" },
      { label: "일정 조율", detail: "학습자가 상사의 일정을 확인하며 회의 시간을 조율하는 중" },
    ],
  },
  "처음 보는 사람": {
    blurb: "처음 만난 사람과 거리감 있는 정중한 대화. 항상 정중체예요.",
    aiLabel: "처음 보는 사람",
    tones: ["정중체"],
    topics: [
      { label: "길 묻기", detail: "길을 잃은 학습자가 지나가던 현지인에게 길을 묻는 중" },
      { label: "전철 옆자리", detail: "전철에서 옆자리에 앉은 사람과 가볍게 이야기를 시작하는 중" },
      {
        label: "사진 부탁",
        detail: "관광지에서 학습자가 모르는 사람에게 사진을 찍어 달라고 부탁하는 중",
      },
      { label: "모임 첫인사", detail: "모임에서 처음 만난 사람과 자기소개를 주고받는 중" },
      { label: "이웃 인사", detail: "이사 온 학습자가 옆집 사람에게 처음 인사하는 중" },
    ],
  },
  점원: {
    blurb: "가게에서 손님으로 말하기. 가게 종류는 시작할 때 무작위로 정해져요.",
    aiLabel: "점원",
    tones: ["정중체"],
    topics: STORES,
  },
};

export function isConversationScenario(value: string): value is ConversationScenario {
  return (CONVERSATION_SCENARIOS as readonly string[]).includes(value);
}

/** 세부 상황을 무작위로 고른다. random을 주입할 수 있어 테스트가 결정적이다. */
export function pickTopic(
  scenario: ConversationScenario,
  random: () => number = Math.random,
): ConversationTopic {
  const { topics } = CONVERSATION_SCENARIO_DEFS[scenario];
  const index = Math.min(Math.floor(random() * topics.length), topics.length - 1);
  return topics[index];
}

/** 저장된 label로 세부 상황을 찾는다(없으면 null — 목록이 바뀐 옛 세션 방어). */
export function findTopic(scenario: ConversationScenario, label: string): ConversationTopic | null {
  return CONVERSATION_SCENARIO_DEFS[scenario].topics.find((t) => t.label === label) ?? null;
}

/** 시나리오가 허용하는 말투인지. */
export function isToneAllowed(scenario: ConversationScenario, tone: string): boolean {
  return (CONVERSATION_SCENARIO_DEFS[scenario].tones as readonly string[]).includes(tone);
}

/** 사용자 입력이 프롬프트의 태그 구조를 깨지 못하게 꺾쇠를 전각으로 바꾼다. */
export function sanitizeForPrompt(text: string): string {
  return text.replace(/</g, "＜").replace(/>/g, "＞").trim();
}

export interface TranscriptMessage {
  role: "AI" | "USER";
  text: string;
}

/** 최근 windowTurns 턴만 골라 "[상대]/[학습자]" 줄로 만든다. 이력은 데이터일 뿐이라 항상 sanitize한다. */
export function buildTranscript(
  messages: readonly TranscriptMessage[],
  windowTurns: number = CONVERSATION_HISTORY_WINDOW_TURNS,
): string {
  const recent = messages.slice(-windowTurns * 2);
  return recent
    .map((m) => `[${m.role === "AI" ? "상대" : "학습자"}] ${sanitizeForPrompt(m.text)}`)
    .join("\n");
}

/** 힌트를 쓴 발화 비율이 절반을 넘으면 낮은 EXP를 준다. */
export function resolveConversationExp(userTurns: number, hintUsedTurns: number): number {
  return hintUsedTurns * 2 > userTurns ? CONVERSATION_HINT_EXP : CONVERSATION_EXP;
}

export interface ConversationScoredLike {
  score: number | null;
  grammar_score: number | null;
  vocabulary_score: number | null;
  naturalness_score: number | null;
  is_accepted: boolean | null;
}

/** 채점이 붙은 발화만 모아 작문 퀘스트와 같은 요약 형태로 만든다. */
export function summarizeConversation(
  messages: readonly ConversationScoredLike[],
): CompositionSummary {
  const scored = messages.filter(
    (m): m is ConversationScoredLike & { score: number } => m.score !== null,
  );
  const average = (pick: (m: ConversationScoredLike) => number | null): number => {
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((sum, m) => sum + (pick(m) ?? 0), 0) / scored.length);
  };
  return {
    answeredCount: scored.length,
    acceptedCount: scored.filter((m) => m.is_accepted).length,
    averageScore: average((m) => m.score),
    averageGrammar: average((m) => m.grammar_score),
    averageVocabulary: average((m) => m.vocabulary_score),
    averageNaturalness: average((m) => m.naturalness_score),
  };
}

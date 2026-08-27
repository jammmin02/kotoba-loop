import type { TodaySummaryCategoryKey } from "@/lib/study/today-summary";

export interface TodaySummaryCategory {
  key: TodaySummaryCategoryKey;
  label: string;
  count: number;
}

export interface TodaySummaryResponse {
  categories: TodaySummaryCategory[];
  totalCount: number;
  estimatedMinutes: number;
  estimatedTimeLabel: string;
  /** 오늘 KST 기준으로 이미 학습/복습을 마친 단어 수 — Progress Ring의 진행분에 해당한다. */
  completedToday: number;
  /** 사용자가 지금까지 단 한 개라도 단어를 등록했는지 여부. false면 "오늘 학습 완료"가 아니라
   * "아직 등록된 단어가 없다"는 빈 상태를 보여줘야 한다. */
  hasAnyVocabulary: boolean;
  /** "오늘의 한자"(PROMPT 36) 개수 — 신규/복습/취약 한자 합. 단어 큐(`categories`/`totalCount`)와
   * 별개로 관리한다 — 일일 완료 보너스 판정은 계속 단어 큐 기준으로만 이루어진다. */
  todayKanjiCount: number;
}

/** 플래시카드 세션(PROMPT 18)이 필요로 하는 최소 단어 정보. 태그 학습 큐는 `examples`가 항상 빈 배열이다
 * (신규 API 없이 `GET /api/vocabularies?tagId=`를 재사용하는데, 그 응답에는 예문이 포함되지 않기 때문). */
export interface SessionCard {
  vocabularyId: string;
  word: string;
  reading: string;
  meanings: string[];
  examples: { japanese: string; korean: string }[];
}

export interface StudyQueueItem extends SessionCard {
  category: TodaySummaryCategoryKey;
}

export interface StudyQueueResponse {
  items: StudyQueueItem[];
}

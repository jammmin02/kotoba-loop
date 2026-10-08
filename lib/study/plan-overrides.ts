import { MAX_KANJI_PER_DAY, MAX_NEW_WORDS_PER_DAY } from "@/lib/study/exam-plan";

/**
 * "AI 추천 학습량 적용"(PROMPT 43)이 `GET /api/study/today-summary`/`GET /api/study/queue`에
 * 보내는 `newWordTarget`/`kanjiTarget` 쿼리 파라미터를 읽는다. 둘 다 선택값이라 없으면
 * 각 함수가 원래 쓰던 기본값(온보딩 설정/고정 상수)으로 자연히 되돌아간다. 클라이언트가
 * 임의의 값을 보내도 큐가 비정상적으로 커지지 않도록 추천 계산과 같은 상한으로 clamp한다.
 */
export function parseTodayTargetOverrides(searchParams: URLSearchParams): {
  newWordTarget: number | undefined;
  kanjiTarget: number | undefined;
} {
  return {
    newWordTarget: parsePositiveIntParam(searchParams.get("newWordTarget"), MAX_NEW_WORDS_PER_DAY),
    kanjiTarget: parsePositiveIntParam(searchParams.get("kanjiTarget"), MAX_KANJI_PER_DAY),
  };
}

/**
 * "더 학습하기"가 보내는 `extra=1` — 오늘의 신규/복습 상한을 넘겨 한 번 더 학습하겠다는 뜻이다.
 * 이 값은 해당 요청의 큐 계산에만 쓰이고 사용자 설정은 건드리지 않는다.
 */
export function parseIgnoreDailyLimits(searchParams: URLSearchParams): boolean {
  return searchParams.get("extra") === "1";
}

function parsePositiveIntParam(value: string | null, max: number): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return Math.min(parsed, max);
}

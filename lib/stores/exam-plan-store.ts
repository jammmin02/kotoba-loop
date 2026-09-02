"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * "AI 추천 학습량 적용"(PROMPT 43)의 적용/무시 상태 — "기존 하루 목표값을 임시 조정"한다는
 * 계획서 문구대로, 온보딩 `dailyWordTarget`/한자 고정 상수를 서버에 영구히 덮어쓰지 않고
 * 이 클라이언트 저장값을 오늘 하루만 today-summary/queue 요청에 얹어 보낸다(dateKey가
 * 오늘과 다르면 자연히 무효화된다 — lib/study/plan-overrides.ts가 서버 쪽 파싱을 맡는다).
 */
interface ExamPlanAppliedState {
  /** 이 결정(적용/무시)이 유효한 KST 날짜 키. 오늘과 다르면 무시한다. */
  dateKey: string | null;
  status: "applied" | "dismissed" | null;
  newWordsPerDay: number | null;
  kanjiPerDay: number | null;
  apply: (dateKey: string, plan: { newWordsPerDay: number; kanjiPerDay: number }) => void;
  dismiss: (dateKey: string) => void;
}

export const useExamPlanStore = create<ExamPlanAppliedState>()(
  persist(
    (set) => ({
      dateKey: null,
      status: null,
      newWordsPerDay: null,
      kanjiPerDay: null,
      apply: (dateKey, plan) =>
        set({
          dateKey,
          status: "applied",
          newWordsPerDay: plan.newWordsPerDay,
          kanjiPerDay: plan.kanjiPerDay,
        }),
      dismiss: (dateKey) =>
        set({ dateKey, status: "dismissed", newWordsPerDay: null, kanjiPerDay: null }),
    }),
    { name: "kotoba-exam-plan-applied" },
  ),
);

/** 오늘 이미 적용된 추천이 있으면 today-summary/queue에 얹을 override를, 없으면 빈 객체를 반환한다. */
export function useTodayPlanOverride(todayDateKey: string): {
  newWordTarget?: number;
  kanjiTarget?: number;
} {
  const state = useExamPlanStore((store) => store);
  if (state.dateKey !== todayDateKey || state.status !== "applied") return {};
  return {
    newWordTarget: state.newWordsPerDay ?? undefined,
    kanjiTarget: state.kanjiPerDay ?? undefined,
  };
}

/** 오늘 이미 적용/무시 결정을 내렸는지 — 카드를 다시 보여줄지 판단에 쓴다. */
export function useTodayPlanDecision(todayDateKey: string): "applied" | "dismissed" | null {
  const state = useExamPlanStore((store) => store);
  if (state.dateKey !== todayDateKey) return null;
  return state.status;
}

/** `useTodayPlanOverride`의 결과를 `today-summary`/`queue` 요청 경로에 그대로 붙일 쿼리
 * 문자열로 만든다("" 아니면 "?..." 형태). */
export function buildTodayOverrideQueryString(override: {
  newWordTarget?: number;
  kanjiTarget?: number;
}): string {
  const params = new URLSearchParams();
  if (override.newWordTarget !== undefined)
    params.set("newWordTarget", String(override.newWordTarget));
  if (override.kanjiTarget !== undefined) params.set("kanjiTarget", String(override.kanjiTarget));
  const query = params.toString();
  return query ? `?${query}` : "";
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { PixelSparkles } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import { toKstDateKey } from "@/lib/datetime";
import { useExamPlanStore, useTodayPlanDecision } from "@/lib/stores/exam-plan-store";
import type { ExamPlanResponse } from "@/types/exam-goal";

/**
 * "AI 추천 학습량 적용" 카드(PROMPT 43, 계획서 52장) — 오늘의 학습(app/page.tsx) 위에 얹어
 * 활성 시험 목표 기준 추천 수치를 보여주고, "적용"/"무시하고 기존 설정 유지"를 둘 다 명확히
 * 제공한다. 적용은 서버 설정을 영구히 바꾸지 않고 오늘 하루만 today-summary/queue 요청에
 * override로 얹는(lib/stores/exam-plan-store.ts) 방식이라, 적용 후 반드시 오늘의 학습
 * 쿼리를 무효화해서 화면에 바로 반영한다.
 */
export function ExamPlanCard() {
  const queryClient = useQueryClient();
  const todayDateKey = toKstDateKey(new Date());
  const decision = useTodayPlanDecision(todayDateKey);
  const { apply, dismiss } = useExamPlanStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["study", "exam-plan"],
    queryFn: () => apiFetch<ExamPlanResponse>("/api/study/exam-plan"),
  });

  // 활성 목표가 없거나 조회에 실패해도 오늘의 학습 화면 전체를 막지 않고 카드만 조용히
  // 숨긴다 — 이 카드는 부가 추천일 뿐, 기존 하루 목표 기반 학습 흐름의 필수 전제가 아니다.
  if (isLoading || isError || !data || data.status === "no_active_goal" || decision === "dismissed") {
    return null;
  }

  const { activeGoal, daysRemaining, plan, comment } = data;

  function invalidateTodayQueries() {
    queryClient.invalidateQueries({ queryKey: ["study", "today-summary"] });
    queryClient.invalidateQueries({ queryKey: ["study", "queue"] });
  }

  function handleApply() {
    apply(todayDateKey, { newWordsPerDay: plan.newWordsPerDay, kanjiPerDay: plan.kanjiPerDay });
    invalidateTodayQueries();
  }

  function handleDismiss() {
    dismiss(todayDateKey);
  }

  return (
    <Card variant="elevated" title="AI 추천 학습량" titleColor="accent" className="flex w-full max-w-md flex-col gap-3">
      <p className="text-xs font-bold text-foreground/60">
        목표 JLPT {activeGoal.targetJlpt} · 시험까지 {daysRemaining}일
      </p>

      <ul className="grid grid-cols-2 gap-2 text-sm">
        <li className="flex items-center justify-between border-2 border-pixel-ink bg-background px-3 py-2">
          <span className="font-bold text-foreground">새 단어</span>
          <span className="font-bold text-foreground/70">{plan.newWordsPerDay}개</span>
        </li>
        <li className="flex items-center justify-between border-2 border-pixel-ink bg-background px-3 py-2">
          <span className="font-bold text-foreground">복습</span>
          <span className="font-bold text-foreground/70">{plan.reviewPerDay}개</span>
        </li>
        <li className="flex items-center justify-between border-2 border-pixel-ink bg-background px-3 py-2">
          <span className="font-bold text-foreground">한자</span>
          <span className="font-bold text-foreground/70">{plan.kanjiPerDay}개</span>
        </li>
        <li className="flex items-center justify-between border-2 border-pixel-ink bg-background px-3 py-2">
          <span className="font-bold text-foreground">문장</span>
          <span className="font-bold text-foreground/70">{plan.sentencePerDay}문제</span>
        </li>
      </ul>

      <p className="text-xs text-foreground/60">예상 소요 시간 약 {plan.estimatedMinutes}분</p>

      {comment && (
        <div className="border-2 border-pixel-ink bg-titlebar-mint/20 p-3">
          <p className="text-xs font-bold text-foreground/60">AI 코멘트</p>
          <p className="mt-1 text-sm text-foreground">{comment}</p>
        </div>
      )}

      {decision === "applied" ? (
        <p className="flex items-center gap-2 text-sm font-bold text-success">
          <PixelSparkles className="size-4" aria-hidden="true" />
          오늘의 목표에 적용했어요
        </p>
      ) : (
        <div className="flex gap-2">
          <Button type="button" onClick={handleApply} className="flex-1">
            적용
          </Button>
          <Button type="button" variant="outline" onClick={handleDismiss} className="flex-1">
            무시하고 기존 설정 유지
          </Button>
        </div>
      )}
    </Card>
  );
}

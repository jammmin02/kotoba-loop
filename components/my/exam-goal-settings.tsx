"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { toKstDateKey } from "@/lib/datetime";
import { JLPT_LEVELS } from "@/lib/validations/onboarding";
import type { JlptLevelValue } from "@/lib/validations/onboarding";
import type { ExamGoalResponse } from "@/types/exam-goal";

import type { FormEvent } from "react";

function formatExamDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${year}년 ${month}월 ${day}일`;
}

/**
 * MY 화면(PROMPT 25-A)의 시험 목표 섹션(PROMPT 43) — 여러 목표를 리스트로 보여주고 그중
 * 하나를 "현재 목표"로 지정할 수 있게 한다(2026-08-25 확정). 활성 목표가 곧 오늘의 학습
 * 홈(`ExamPlanCard`)의 추천 계산 기준이 된다.
 */
export function ExamGoalSettings() {
  const queryClient = useQueryClient();
  const todayDateKey = toKstDateKey(new Date());
  const [targetJlpt, setTargetJlpt] = useState<JlptLevelValue>();
  const [examDate, setExamDate] = useState(todayDateKey);
  const [formError, setFormError] = useState<string>();

  const {
    data: goals,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["users", "me", "exam-goals"],
    queryFn: () => apiFetch<ExamGoalResponse[]>("/api/users/me/exam-goals"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<ExamGoalResponse>("/api/users/me/exam-goals", {
        method: "POST",
        body: { targetJlpt, examDate },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me", "exam-goals"] });
      queryClient.invalidateQueries({ queryKey: ["study", "exam-plan"] });
      setTargetJlpt(undefined);
      setFormError(undefined);
      toast.success("시험 목표를 등록했습니다.");
    },
    onError: (err) => {
      setFormError(err instanceof ApiClientError ? err.message : "시험 목표 등록에 실패했습니다.");
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<ExamGoalResponse>(`/api/users/me/exam-goals/${id}`, {
        method: "PATCH",
        body: { isActive: true },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me", "exam-goals"] });
      queryClient.invalidateQueries({ queryKey: ["study", "exam-plan"] });
      toast.success("현재 목표를 전환했습니다.");
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "목표 전환에 실패했습니다.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!targetJlpt || !examDate) return;
    createMutation.mutate();
  }

  return (
    <Card title="EXAM GOAL.EXE" titleColor="pink" className="flex flex-col gap-4">
      <p className="text-sm font-bold text-foreground">시험 목표</p>

      {isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}
      {isError && (
        <p className="text-sm text-error">
          {error instanceof ApiClientError ? error.message : "시험 목표를 불러오지 못했습니다."}
        </p>
      )}
      {goals && goals.length === 0 && (
        <p className="text-sm text-foreground/50">
          등록된 시험 목표가 없어요. 아래에서 추가해보세요.
        </p>
      )}
      {goals && goals.length > 0 && (
        <ul className="flex flex-col gap-2">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="flex items-center justify-between gap-2 border-2 border-pixel-ink bg-background px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">JLPT {goal.targetJlpt}</span>
                <span className="text-xs text-foreground/60">{formatExamDate(goal.examDate)}</span>
              </div>
              {goal.isActive ? (
                <span className="text-xs font-bold text-primary">현재 목표</span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => activateMutation.mutate(goal.id)}
                  loading={activateMutation.isPending}
                >
                  현재 목표로
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 border-t-2 border-pixel-ink pt-4"
      >
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-foreground/60">목표 JLPT 급수</p>
          <div className="flex flex-wrap gap-2">
            {JLPT_LEVELS.map((level) => (
              <ChipButton
                key={level}
                selected={targetJlpt === level}
                onClick={() => setTargetJlpt(level)}
              >
                {level}
              </ChipButton>
            ))}
          </div>
        </div>

        <Input
          type="date"
          label="시험일"
          value={examDate}
          min={todayDateKey}
          onChange={(e) => setExamDate(e.target.value)}
        />

        {formError && <p className="text-sm text-error">{formError}</p>}

        <Button
          type="submit"
          disabled={!targetJlpt || !examDate}
          loading={createMutation.isPending}
          className="self-end"
        >
          목표 추가
        </Button>
      </form>
    </Card>
  );
}

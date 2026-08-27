"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ProgressRing } from "@/components/game/progress-ring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { ONBOARDING_TOTAL_STEPS, useOnboardingStore } from "@/lib/stores/onboarding-store";
import {
  CURRENT_LEVEL_OPTIONS,
  CUSTOM_WORD_TARGET_MAX,
  CUSTOM_WORD_TARGET_MIN,
  ONBOARDING_DEFAULTS,
  PURPOSE_OPTIONS,
  STUDY_TIME_PRESETS,
  TARGET_LEVEL_OPTIONS,
  WORD_TARGET_PRESETS,
} from "@/lib/validations/onboarding";
import type { OnboardingInput } from "@/lib/validations/onboarding";

const STEP_TITLES = [
  "현재 일본어 수준을 알려주세요",
  "목표 JLPT 급수를 선택해주세요",
  "하루에 몇 개의 새 단어를 배울까요?",
  "하루 목표 학습 시간은 얼마나 될까요?",
  "학습 목적을 모두 선택해주세요",
];

export function OnboardingWizard() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const store = useOnboardingStore();
  const {
    step,
    currentLevel,
    targetJlpt,
    dailyWordTarget,
    isCustomWordTarget,
    customWordTargetInput,
    dailyStudyTime,
    purposes,
  } = store;

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return currentLevel !== undefined;
      case 2:
        return targetJlpt !== undefined;
      case 3:
        return dailyWordTarget !== undefined;
      case 4:
        return dailyStudyTime !== undefined;
      case 5:
        return purposes.length > 0;
      default:
        return false;
    }
  }, [step, currentLevel, targetJlpt, dailyWordTarget, dailyStudyTime, purposes]);

  async function submit(payload: OnboardingInput, successMessage: string) {
    setSubmitting(true);
    try {
      await apiFetch("/api/users/me/onboarding", { method: "PATCH", body: payload });
      store.reset();
      toast.success(successMessage);
      router.push("/");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "저장 중 오류가 발생했습니다.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleComplete() {
    void submit(
      {
        jlptLevel: currentLevel === "BEGINNER" ? null : currentLevel,
        targetJlpt,
        dailyWordTarget,
        dailyStudyTime,
        purpose: purposes,
      },
      "온보딩이 완료되었습니다. 오늘부터 학습을 시작해보세요!",
    );
  }

  function handleSkip() {
    void submit(ONBOARDING_DEFAULTS, "기본값으로 설정했어요. MY에서 언제든 바꿀 수 있어요.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ProgressRing value={step} max={ONBOARDING_TOTAL_STEPS} size={56} strokeWidth={6} />
          <div>
            <p className="text-xs font-bold text-foreground/50">
              STEP {step}/{ONBOARDING_TOTAL_STEPS}
            </p>
            <p className="text-base font-bold text-foreground">학습 설정</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          disabled={submitting}
          className="text-xs font-bold text-foreground/50 underline underline-offset-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          나중에 하기
        </button>
      </div>

      <Card variant="elevated" title="ONBOARDING.EXE" titleColor="mint" className="flex flex-col gap-5">
        <h1 className="text-lg font-bold text-foreground">{STEP_TITLES[step - 1]}</h1>

        {step === 1 && (
          <div className="flex flex-wrap gap-2">
            {CURRENT_LEVEL_OPTIONS.map((option) => (
              <ChipButton
                key={option.value}
                selected={currentLevel === option.value}
                onClick={() => store.setCurrentLevel(option.value)}
              >
                {option.label}
              </ChipButton>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-wrap gap-2">
            {TARGET_LEVEL_OPTIONS.map((option) => (
              <ChipButton
                key={option.value}
                selected={targetJlpt === option.value}
                onClick={() => store.setTargetJlpt(option.value)}
              >
                {option.label}
              </ChipButton>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {WORD_TARGET_PRESETS.map((preset) => (
                <ChipButton
                  key={preset}
                  selected={!isCustomWordTarget && dailyWordTarget === preset}
                  onClick={() => store.selectWordTargetPreset(preset)}
                >
                  {preset}개
                </ChipButton>
              ))}
              <ChipButton selected={isCustomWordTarget} onClick={() => store.selectCustomWordTarget()}>
                직접 입력
              </ChipButton>
            </div>
            {isCustomWordTarget && (
              <Input
                type="number"
                inputMode="numeric"
                placeholder={`${CUSTOM_WORD_TARGET_MIN}~${CUSTOM_WORD_TARGET_MAX} 사이 숫자`}
                value={customWordTargetInput}
                onChange={(e) => store.setCustomWordTargetInput(e.target.value)}
                error={
                  customWordTargetInput !== "" && dailyWordTarget === undefined
                    ? `${CUSTOM_WORD_TARGET_MIN}~${CUSTOM_WORD_TARGET_MAX} 사이의 숫자를 입력해주세요.`
                    : undefined
                }
              />
            )}
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-wrap gap-2">
            {STUDY_TIME_PRESETS.map((preset) => (
              <ChipButton
                key={preset.value}
                selected={dailyStudyTime === preset.value}
                onClick={() => store.setDailyStudyTime(preset.value)}
              >
                {preset.label}
              </ChipButton>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-wrap gap-2">
            {PURPOSE_OPTIONS.map((option) => (
              <ChipButton
                key={option.value}
                selected={purposes.includes(option.value)}
                onClick={() => store.togglePurpose(option.value)}
              >
                {option.label}
              </ChipButton>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button type="button" variant="outline" onClick={store.goBack} disabled={step === 1 || submitting}>
            이전
          </Button>
          {step < ONBOARDING_TOTAL_STEPS ? (
            <Button type="button" onClick={store.goNext} disabled={!canProceed}>
              다음
            </Button>
          ) : (
            <Button type="button" onClick={handleComplete} disabled={!canProceed} loading={submitting}>
              완료
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

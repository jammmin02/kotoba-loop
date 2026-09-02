"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import {
  CURRENT_LEVEL_OPTIONS,
  CUSTOM_WORD_TARGET_MAX,
  CUSTOM_WORD_TARGET_MIN,
  PURPOSE_OPTIONS,
  STUDY_TIME_PRESETS,
  TARGET_LEVEL_OPTIONS,
  WORD_TARGET_PRESETS,
} from "@/lib/validations/onboarding";
import type {
  CurrentLevelValue,
  JlptLevelValue,
  OnboardingInput,
  PurposeValue,
} from "@/lib/validations/onboarding";
import type { UserProfileResponse } from "@/types/user";

function isPresetWordTarget(value: number): boolean {
  return (WORD_TARGET_PRESETS as readonly number[]).includes(value);
}

/**
 * PROMPT 08에서 API만 만들고 미뤄둔 온보딩 값 재수정 화면(PROMPT 25-A) — 위저드(`OnboardingWizard`)와
 * 동일한 `onboardingSchema`/옵션 상수를 재사용하되, 단계 이동 없이 한 화면에서 전체 값을 보여주고
 * 저장한다.
 */
export function OnboardingSettingsForm({ profile }: { profile: UserProfileResponse }) {
  const [submitting, setSubmitting] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<CurrentLevelValue>(
    (profile.jlptLevel as CurrentLevelValue | null) ?? "BEGINNER",
  );
  const [targetJlpt, setTargetJlpt] = useState<JlptLevelValue | undefined>(
    (profile.targetJlpt as JlptLevelValue | null) ?? undefined,
  );
  const [dailyWordTarget, setDailyWordTarget] = useState<number | undefined>(
    profile.dailyWordTarget ?? 10,
  );
  const [isCustomWordTarget, setIsCustomWordTarget] = useState(
    profile.dailyWordTarget != null && !isPresetWordTarget(profile.dailyWordTarget),
  );
  const [customWordTargetInput, setCustomWordTargetInput] = useState(
    profile.dailyWordTarget != null && !isPresetWordTarget(profile.dailyWordTarget)
      ? String(profile.dailyWordTarget)
      : "",
  );
  const [dailyStudyTime, setDailyStudyTime] = useState(profile.dailyStudyTime ?? 20);
  const [purposes, setPurposes] = useState<PurposeValue[]>(
    (profile.purpose as PurposeValue[]) ?? [],
  );

  function selectWordTargetPreset(preset: number) {
    setIsCustomWordTarget(false);
    setCustomWordTargetInput("");
    setDailyWordTarget(preset);
  }

  function handleCustomWordTargetInput(value: string) {
    setCustomWordTargetInput(value);
    const parsed = Number(value);
    const valid =
      value.trim() !== "" &&
      Number.isInteger(parsed) &&
      parsed >= CUSTOM_WORD_TARGET_MIN &&
      parsed <= CUSTOM_WORD_TARGET_MAX;
    setDailyWordTarget(valid ? parsed : undefined);
  }

  function togglePurpose(value: PurposeValue) {
    setPurposes((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    );
  }

  const canSave = targetJlpt !== undefined && dailyWordTarget !== undefined && purposes.length > 0;

  async function handleSave() {
    setSubmitting(true);
    try {
      const payload: OnboardingInput = {
        jlptLevel: currentLevel === "BEGINNER" ? null : currentLevel,
        targetJlpt,
        dailyWordTarget,
        dailyStudyTime,
        purpose: purposes,
      };
      await apiFetch("/api/users/me/onboarding", { method: "PATCH", body: payload });
      toast.success("학습 설정이 저장되었습니다.");
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "저장 중 오류가 발생했습니다.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="SETTINGS.EXE" titleColor="mint" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-foreground">현재 일본어 수준</p>
        <div className="flex flex-wrap gap-2">
          {CURRENT_LEVEL_OPTIONS.map((option) => (
            <ChipButton
              key={option.value}
              selected={currentLevel === option.value}
              onClick={() => setCurrentLevel(option.value)}
            >
              {option.label}
            </ChipButton>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-foreground">목표 JLPT 급수</p>
        <div className="flex flex-wrap gap-2">
          {TARGET_LEVEL_OPTIONS.map((option) => (
            <ChipButton
              key={option.value}
              selected={targetJlpt === option.value}
              onClick={() => setTargetJlpt(option.value)}
            >
              {option.label}
            </ChipButton>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-foreground">하루 목표 단어 수</p>
        <div className="flex flex-wrap gap-2">
          {WORD_TARGET_PRESETS.map((preset) => (
            <ChipButton
              key={preset}
              selected={!isCustomWordTarget && dailyWordTarget === preset}
              onClick={() => selectWordTargetPreset(preset)}
            >
              {preset}개
            </ChipButton>
          ))}
          <ChipButton
            selected={isCustomWordTarget}
            onClick={() => {
              setIsCustomWordTarget(true);
              setDailyWordTarget(undefined);
            }}
          >
            직접 입력
          </ChipButton>
        </div>
        {isCustomWordTarget && (
          <Input
            type="number"
            inputMode="numeric"
            placeholder={`${CUSTOM_WORD_TARGET_MIN}~${CUSTOM_WORD_TARGET_MAX} 사이 숫자`}
            value={customWordTargetInput}
            onChange={(e) => handleCustomWordTargetInput(e.target.value)}
            error={
              customWordTargetInput !== "" && dailyWordTarget === undefined
                ? `${CUSTOM_WORD_TARGET_MIN}~${CUSTOM_WORD_TARGET_MAX} 사이의 숫자를 입력해주세요.`
                : undefined
            }
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-foreground">하루 목표 학습 시간</p>
        <div className="flex flex-wrap gap-2">
          {STUDY_TIME_PRESETS.map((preset) => (
            <ChipButton
              key={preset.value}
              selected={dailyStudyTime === preset.value}
              onClick={() => setDailyStudyTime(preset.value)}
            >
              {preset.label}
            </ChipButton>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-foreground">학습 목적</p>
        <div className="flex flex-wrap gap-2">
          {PURPOSE_OPTIONS.map((option) => (
            <ChipButton
              key={option.value}
              selected={purposes.includes(option.value)}
              onClick={() => togglePurpose(option.value)}
            >
              {option.label}
            </ChipButton>
          ))}
        </div>
      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        loading={submitting}
        className="self-end"
      >
        저장
      </Button>
    </Card>
  );
}

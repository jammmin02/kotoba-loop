"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { CUSTOM_WORD_TARGET_MAX, CUSTOM_WORD_TARGET_MIN } from "@/lib/validations/onboarding";
import type { CurrentLevelValue, JlptLevelValue, PurposeValue } from "@/lib/validations/onboarding";

export const ONBOARDING_TOTAL_STEPS = 5;

interface OnboardingValues {
  step: number;
  currentLevel?: CurrentLevelValue;
  targetJlpt?: JlptLevelValue;
  dailyWordTarget?: number;
  isCustomWordTarget: boolean;
  customWordTargetInput: string;
  dailyStudyTime?: number;
  purposes: PurposeValue[];
}

interface OnboardingState extends OnboardingValues {
  setCurrentLevel: (value: CurrentLevelValue) => void;
  setTargetJlpt: (value: JlptLevelValue) => void;
  selectWordTargetPreset: (value: number) => void;
  selectCustomWordTarget: () => void;
  setCustomWordTargetInput: (value: string) => void;
  setDailyStudyTime: (value: number) => void;
  togglePurpose: (value: PurposeValue) => void;
  goNext: () => void;
  goBack: () => void;
  reset: () => void;
}

const initialValues: OnboardingValues = {
  step: 1,
  currentLevel: undefined,
  targetJlpt: undefined,
  dailyWordTarget: undefined,
  isCustomWordTarget: false,
  customWordTargetInput: "",
  dailyStudyTime: undefined,
  purposes: [],
};

function parseCustomWordTarget(input: string): number | undefined {
  if (input.trim() === "") return undefined;
  const parsed = Number(input);
  if (!Number.isInteger(parsed)) return undefined;
  if (parsed < CUSTOM_WORD_TARGET_MIN || parsed > CUSTOM_WORD_TARGET_MAX) return undefined;
  return parsed;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialValues,
      setCurrentLevel: (value) => set({ currentLevel: value }),
      setTargetJlpt: (value) => set({ targetJlpt: value }),
      selectWordTargetPreset: (value) =>
        set({ dailyWordTarget: value, isCustomWordTarget: false, customWordTargetInput: "" }),
      selectCustomWordTarget: () =>
        set((state) => ({
          isCustomWordTarget: true,
          dailyWordTarget: parseCustomWordTarget(state.customWordTargetInput),
        })),
      setCustomWordTargetInput: (value) =>
        set({ customWordTargetInput: value, dailyWordTarget: parseCustomWordTarget(value) }),
      setDailyStudyTime: (value) => set({ dailyStudyTime: value }),
      togglePurpose: (value) =>
        set((state) => ({
          purposes: state.purposes.includes(value)
            ? state.purposes.filter((p) => p !== value)
            : [...state.purposes, value],
        })),
      goNext: () => set((state) => ({ step: Math.min(state.step + 1, ONBOARDING_TOTAL_STEPS) })),
      goBack: () => set((state) => ({ step: Math.max(state.step - 1, 1) })),
      reset: () => set(initialValues),
    }),
    { name: "kotoba-onboarding-draft" },
  ),
);

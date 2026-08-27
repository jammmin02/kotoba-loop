import { z } from "zod";

export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
export type JlptLevelValue = (typeof JLPT_LEVELS)[number];

export const CURRENT_LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "입문 (JLPT 급수 없음)" },
  { value: "N5", label: "N5" },
  { value: "N4", label: "N4" },
  { value: "N3", label: "N3" },
  { value: "N2", label: "N2" },
  { value: "N1", label: "N1" },
] as const;
export type CurrentLevelValue = (typeof CURRENT_LEVEL_OPTIONS)[number]["value"];

export const TARGET_LEVEL_OPTIONS = JLPT_LEVELS.map((level) => ({ value: level, label: level }));

export const WORD_TARGET_PRESETS = [5, 10, 15, 20] as const;
export const CUSTOM_WORD_TARGET_MIN = 1;
export const CUSTOM_WORD_TARGET_MAX = 100;

export const STUDY_TIME_PRESETS = [
  { value: 10, label: "10분" },
  { value: 20, label: "20분" },
  { value: 30, label: "30분" },
  { value: 60, label: "60분" },
] as const;

export const PURPOSE_OPTIONS = [
  { value: "JLPT", label: "JLPT 시험 대비" },
  { value: "JOB", label: "취업" },
  { value: "STUDY_ABROAD", label: "유학" },
  { value: "TRAVEL", label: "여행" },
  { value: "CONVERSATION", label: "회화" },
  { value: "MEDIA", label: "애니·드라마" },
  { value: "READING", label: "독해" },
  { value: "SELF_DEVELOPMENT", label: "자기계발" },
] as const;
export type PurposeValue = (typeof PURPOSE_OPTIONS)[number]["value"];

/** Applied when the user skips onboarding — kept editable later from MY > 학습 목표. */
export const ONBOARDING_DEFAULTS = {
  jlptLevel: null as JlptLevelValue | null,
  targetJlpt: null as JlptLevelValue | null,
  dailyWordTarget: 10,
  dailyStudyTime: 20,
  purpose: [] as string[],
};

const jlptLevelEnum = z.enum(JLPT_LEVELS);

/**
 * Every field is independently optional so this schema doubles as the payload
 * shape for the future MY > 학습 목표 edit screen (partial updates), not just
 * the all-fields-at-once onboarding wizard.
 */
export const onboardingSchema = z.object({
  jlptLevel: jlptLevelEnum.nullable().optional(),
  targetJlpt: jlptLevelEnum.nullable().optional(),
  dailyWordTarget: z
    .number()
    .int()
    .min(CUSTOM_WORD_TARGET_MIN, "1 이상이어야 합니다.")
    .max(CUSTOM_WORD_TARGET_MAX, "100 이하로 입력해주세요.")
    .optional(),
  dailyStudyTime: z
    .number()
    .int()
    .min(5, "5분 이상이어야 합니다.")
    .max(240, "240분 이하로 입력해주세요.")
    .optional(),
  purpose: z.array(z.string().min(1)).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

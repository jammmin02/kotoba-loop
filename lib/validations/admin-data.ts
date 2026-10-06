import { z } from "zod";

const jlptSchema = z.enum(["N5", "N4", "N3", "N2", "N1"]);

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label}을(를) 입력해주세요.`).max(max, `${label}이(가) 너무 깁니다.`);

const textList = (label: string, maxItems: number, maxLength: number, min = 0) =>
  z
    .array(z.string().trim().min(1, `${label}에 빈 항목이 있습니다.`).max(maxLength))
    .min(min, `${label}은(는) 최소 ${min}개 필요합니다.`)
    .max(maxItems, `${label}은(는) 최대 ${maxItems}개입니다.`);

export const adminDataQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const adminVocabularyUpdateSchema = z.object({
  word: requiredText("단어", 100),
  reading: requiredText("읽기", 100),
  partOfSpeech: requiredText("품사", 50),
  jlptLevel: jlptSchema.nullable(),
  meanings: textList("뜻", 10, 200, 1),
});

export const adminKanjiUpdateSchema = z.object({
  onyomi: textList("음독", 10, 50),
  kunyomi: textList("훈독", 10, 50),
  koreanReading: requiredText("한국어 음", 50),
  meaning: requiredText("뜻", 200),
  strokeCount: z.number().int().min(1, "획수는 1 이상이어야 합니다.").max(60),
  radical: requiredText("부수", 20),
  schoolGrade: z.number().int().min(1).max(12).nullable(),
  jlptLevelRef: jlptSchema.nullable(),
});

export type AdminVocabularyUpdate = z.infer<typeof adminVocabularyUpdateSchema>;
export type AdminKanjiUpdate = z.infer<typeof adminKanjiUpdateSchema>;

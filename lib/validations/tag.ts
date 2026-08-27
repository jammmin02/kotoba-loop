import { z } from "zod";

export const TAG_NAME_MAX = 20;

export const createTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "태그 이름을 입력해주세요.")
    .max(TAG_NAME_MAX, `태그 이름은 ${TAG_NAME_MAX}자 이하여야 합니다.`),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

export const vocabularyTagSchema = z.object({
  tagId: z.string().min(1, "태그를 선택해주세요."),
});

export type VocabularyTagInput = z.infer<typeof vocabularyTagSchema>;
